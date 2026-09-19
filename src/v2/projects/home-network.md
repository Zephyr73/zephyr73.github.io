---
layout: base.njk
permalink: /projects/home-network/
title: 'High-Availability Homelab & Hybrid Network Architecture'
description: 'Production-grade personal infrastructure featuring dual-resolver AdGuard DNS redundancy, automated Caddy reverse proxy routing, Proxmox VE LXC micro-segmentation with Intel QuickSync GPU passthrough, multi-daemon Docker orchestration, and zero-trust WireGuard mesh networking.'
date: 2026-09-19
category: Linux System Administration &bull; Networking
tags: project
---

# High-Availability Homelab & Hybrid Network Architecture

A low-power, 24/7 hybrid infrastructure engineered with enterprise operational discipline: containerized micro-segmentation, redundant active-passive DNS, automated reverse proxy ingress, hardware-accelerated transcoding, and zero-trust mesh networking.

---

## Executive Summary & Engineering Philosophy

This project documents the architecture, configuration, and site reliability engineering (SRE) practices governing my personal production homelab and hybrid local network (`192.168.1.0/24`).

Rather than deploying a single unmanaged monolithic server, this infrastructure is engineered around five fundamental production principles:

1. **Zero WAN Attack Surface**: No management dashboards, SSH endpoints, or HTTP services are exposed to the public Internet. Remote ingress is mediated exclusively through an authenticated WireGuard mesh overlay (Tailscale) with mutual key authentication.
2. **Fault Isolation & Micro-Segmentation**: Services are decoupled across lightweight Debian Linux Containers (LXC) on Proxmox VE. A vulnerability, crash, or memory leak in one service (e.g., media streaming) cannot compromise edge proxying, container orchestration, or DNS resolution.
3. **High-Availability (HA) Core Services**: Essential infrastructure—specifically internal DNS resolution—features automated cross-node redundancy with sub-second failover between bare-metal hardware and virtualized instances.
4. **Deterministic Network Topology**: IP allocation follows a strict mathematical scheme where container IDs (`CT ID`) map directly to IPv4 host octets (`192.168.1.100` – `.105`), eliminating ambiguity and reliance on DHCP reservations for critical systems.
5. **Bare-Metal Silicon Optimization**: Leveraging Intel QuickSync Video via direct Linux cgroup device passthrough allows 4K HEVC real-time transcoding at near-zero CPU utilization.

```
+--------------------------------------------------------------------------------------------------+
|                                    INFRASTRUCTURE OVERVIEW                                       |
+----------------------+-----------------------------+---------------------------------------------+
| Layer                | Technology Stack            | Role / Highlight                            |
+----------------------+-----------------------------+---------------------------------------------+
| Hypervisor           | Proxmox VE 9.2.2 (Debian)   | Bare-metal virtualization on OptiPlex Mini  |
| Edge DNS             | AdGuard Home (Dual Node)    | Pi Zero 2 W (Bare metal) + CT102 (PVE LXC)  |
| Ingress Proxy        | Caddy Server (LXC CT100)    | Automated internal TLS & domain routing     |
| Overlay Network      | Tailscale (WireGuard)       | Mesh overlay with dual subnet routers       |
| Hardware Offload     | Intel QuickSync (/dev/dri)  | cgroup passthrough for Jellyfin transcoding |
| Container Engines    | Docker (3 isolated daemons) | Immich, Media Stack, Dockhand SvelteKit UI  |
| Storage Tiering      | NVMe / SATA SSD + 1TB HDD   | Low-latency rootfs + high-capacity ext4     |
+----------------------+-----------------------------+---------------------------------------------+
```

---

## Network Architecture & Topologies

The physical topology operates on a single flat L2 broadcast domain (`192.168.1.0/24`) anchored by a Verizon Fios CR1000B gateway, paired with a virtual switch (`vmbr0`) inside Proxmox and an encrypted WireGuard overlay mesh (`100.68.1.0/24`).

### Visual Topology Diagram

```
                             ~~~~ INTERNET / ISP WAN ~~~~
                                          |
                                   (ONT Fiber Uplink)
                                          |
                           +--------------+--------------+
                           |    Verizon Fios CR1000B     |
                           |       Router / Gateway      |
                           |   IP: 192.168.1.1/24 (DHCP) |
                           +--------------+--------------+
                                          |
               +--------------------------+--------------------------+
               | Limited TCP Forwards:                               |
               | - 25565 -> .200 (Minecraft, on-demand)              |
               | - 35054 -> .200 (qBittorrent P2P)                   |
               | - 37487 -> .104 (qBittorrent P2P)                   |
               +--------------------------+--------------------------+
                                          |
                      +-------------------+-------------------+
                      |             L2 GIGABIT SWITCH         |
                      +---+-----------+-----------+-------+---+
                          |           |           |       |
            .-------------+           |           |       +-------------.
            |                         |           |                     |
            V                         V           V                     V
      [ ARCHIVE ]                [ SAMSUNG ]   [ PI ]              [ VAULT ]
     192.168.1.200              192.168.1.201 192.168.1.202       192.168.1.204
    Windows Workstation         Android Phone Pi Zero 2 W        Proxmox VE 9.2.2
    - Glance Dashboard (:9000)  - Tailscale   - Primary AdGuard  - OptiPlex Mini
    - Sunshine/Apollo (:47990)    Always-On     DNS (:53/:80)    - Subnet Router
    - RustDesk Remote (:21118)                - Subnet Router    - Exit Node
    - OpenSSH Server (:22)                      192.168.1.0/24     192.168.1.0/24
                                                                        |
                                                     (Proxmox vmbr0 Virtual Bridge)
                                                                        |
                  .-----------------+-----------------+-----------------+-----------------+
                  |                 |                 |                 |                 |
                  V                 V                 V                 V                 V
             [ CT 100 ]        [ CT 101 ]        [ CT 102 ]        [ CT 104 ]        [ CT 105 ]
           192.168.1.100     192.168.1.101     192.168.1.102     192.168.1.104     192.168.1.105
           caddy-proxy       immich-host       adguard-2nd       media-host        dockhand-master
           Caddy Reverse     Immich Server     AdGuard Home      Jellyfin (GPU)    Dockhand UI
           Proxy (:80/:443)  Valkey + Postgres Sync Target       qBittorrent       Hawser Engine
                             Hawser Agent      (:53/:80/:8080)   Kavita (:5000)    (:3000)
```

---

## Deterministic IP Schema & Zone Partitioning

To maintain predictability across container lifecycles and automated provisioning scripts, IP addresses within the `/24` subnet are strictly zoned by functional tier:

| Address Range          | Functional Zone                   | Gateway / DNS Policy               | Security & Operational Notes                                                                                                        |
| ---------------------- | --------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `192.168.1.2 – .99`    | Family & Guest Endpoints          | DNS: Router `.1` (Unfiltered)      | Untrusted broadcast clients; direct IP access allowed for media (Jellyfin) without split-horizon dependencies.                      |
| `192.168.1.100 – .199` | Virtualized Infrastructure (LXC)  | DNS: Primary `.202`, Gateway: `.1` | **Container ID == IP Host Octet** (e.g. CT 104 = `192.168.1.104`). Static IP assigned inside container config, not via DHCP leases. |
| `192.168.1.200 – .254` | Compute Nodes & Personal Hardware | DNS: AdGuard `.202` / `.102`       | High-privilege endpoints; registered in Tailnet with cross-subnet routing enabled.                                                  |

### Perimeter Security & Port Forwarding Policy

Public WAN exposure is minimized strictly to P2P and gaming traffic. Management dashboards, Proxmox APIs, SSH, and HTTP/S proxies have **0% public port forwarding**:

- `TCP 25565` -> `192.168.1.200` (Minecraft Server, launched on-demand; port remains dormant when offline)
- `TCP 35054` -> `192.168.1.200` (qBittorrent P2P protocol listening port)
- `TCP 37487` -> `192.168.1.104` (Containerized qBittorrent P2P listening port)
- **All web traffic, admin interfaces, and API endpoints are restricted to local LAN and WireGuard tunnels.**

---

## High-Availability Active-Passive DNS

DNS resolution is the most critical dependency in any self-hosted infrastructure. A failed resolver takes down both internal domain routing and outbound WAN internet access.

```
              [ Client Query: "photos.vault" ]
                             |
             +---------------+---------------+
             | Primary                       | Secondary (Automatic Failover)
             V                               V
     +---------------+               +---------------+
     |  Pi Zero 2 W  |               | Proxmox CT102 |
     | 192.168.1.202 |               | 192.168.1.102 |
     | AdGuard Home  |               | AdGuard Home  |
     +-------+-------+               +-------+-------+
             |                               ^
             |   adguardhome-sync (:8080)    |
             +===============================>
                 (Syncs every 10 minutes)
```

### 1. Dual-Resolver Hardware Distribution

- **Primary Resolver (`192.168.1.202`)**: Runs natively on dedicated bare metal (Raspberry Pi Zero 2 W). Independent from the hypervisor; survives Proxmox reboots, maintenance windows, and host kernel updates.
- **Secondary Resolver (`192.168.1.102`)**: Runs in an unprivileged Debian LXC container (CT102) on Proxmox.

### 2. Automated State Synchronization (`adguardhome-sync`)

Running as a daemon on CT102 (`:8080`), `adguardhome-sync` performs continuous synchronization from the primary Pi node every 10 minutes:

- DNS rewrite rules and local domains
- Filter blocklists (AdGuard DNS filter, HaGeZi's Samsung Tracker Blocklist, EasyPrivacy)
- Client identification tags and rate limits
- Upstream configuration and DNSSEC settings

### 3. Upstream Encryption & Split-Horizon Routing

Outbound DNS queries are dispatched concurrently in parallel mode over encrypted protocols with strict failover semantics:

- **Primary Upstreams**: Quad9 via concurrent DNS-over-HTTPS (`https://dns.quad9.net/dns-query`) and DNS-over-TLS (`tls://dns.quad9.net`). Parallel mode races these two transports to ensure the lowest latency response while validating DNSSEC.
- **Fallback Upstream (`fallback_dns`)**: Cloudflare (`https://1.1.1.1/dns-query`, `tls://1.1.1.1`), queried strictly as a fallback in the event of upstream Quad9 failure.
- **Bootstrap Resolvers**: Plain IP resolution via `9.9.9.9`, `1.1.1.1`, and `1.0.0.1` for initial TLS certificate bootstrapping.

Both resolvers maintain 12 authoritative split-horizon rewrites routing internal service domains (`*.vault`, `*.archive`, `*.lan`) directly to the reverse proxy at `192.168.1.100`.

---

## Edge Ingress & Reverse Proxy Architecture (Caddy)

All web traffic destined for internal services is funneled through an unprivileged Debian LXC container (CT100) running **Caddy Server**.

```
[ HTTPS / HTTP Client ]
          |
          v
+-------------------+       https://vault.lan       +--------------------------+
|   Caddy Proxy     | ----------------------------> | Proxmox VE (.204:8006)   |
|   CT100 (.100)    |       http://photos.vault     +--------------------------+
|                   | ----------------------------> | Immich Server (.101:2283)|
|                   |       http://jellyfin.vault   +--------------------------+
|                   | ----------------------------> | Jellyfin Host (.104:8096)|
|                   |       http://glance.archive   +--------------------------+
|                   | ----------------------------> | Glance Dash (.200:9000)  |
|                   |                               +--------------------------+
|                   |       http://syncthing.archive+--------------------------+
|                   | - - - - - - - - - - - - - - > | 502 Loopback Isolated    |
+-------------------+                               +--------------------------+
```

### Production Route Table

| Ingress Hostname           | Upstream Target               | SSL / TLS Policy                              | Operational Purpose                       |
| -------------------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------- |
| `https://vault.lan`        | `https://192.168.1.204:8006`  | Internal TLS, self-signed verification bypass | Secure access to Proxmox VE Web GUI       |
| `http://glance.archive`    | `http://192.168.1.200:9000`   | Plain HTTP reverse proxy                      | Workstation glance metrics dashboard      |
| `http://apollo.archive`    | `https://192.168.1.200:47990` | Upstream TLS bypass                           | Sunshine game streaming web configuration |
| `http://photos.vault`      | `http://192.168.1.101:2283`   | Internal HTTP reverse proxy                   | Immich photo management & ML pipeline     |
| `http://jellyfin.vault`    | `http://192.168.1.104:8096`   | Host networking passthrough                   | Jellyfin media streaming server           |
| `http://torrent.vault`     | `http://192.168.1.104:8081`   | Internal HTTP reverse proxy                   | Containerized qBittorrent Web UI          |
| `http://books.vault`       | `http://192.168.1.104:5000`   | Internal HTTP reverse proxy                   | Kavita digital library server             |
| `http://syncthing.archive` | `http://192.168.1.200:8384`   | **502 Bad Gateway (Intentional)**             | Bound strictly to `127.0.0.1` on `.200`   |
| `http://asf.archive`       | `http://192.168.1.200:1242`   | **502 Bad Gateway (Intentional)**             | Bound strictly to `127.0.0.1` on `.200`   |

### Defense-in-Depth: The Loopback Isolation Pattern

A critical security feature of this setup is the intentional loopback binding on workstation services (Syncthing and ArchiSteamFarm).

Because these administrative tools lack multi-factor authentication or robust access control, their web listeners are bound strictly to `127.0.0.1` on the host machine. Although Caddy maintains configuration blocks for them, requests across the LAN fail with `HTTP 502 Bad Gateway`. This prevents accidental LAN-wide exposure while allowing immediate access via local loopback or authenticated SSH tunnels (`ssh -L 8384:127.0.0.1:8384 archive`).

---

## Proxmox VE & LXC Micro-Segmentation

The core compute engine is hosted on a compact Dell OptiPlex Mini running **Proxmox Virtual Environment 9.2.2**. Rather than allocating heavy virtual machines with independent kernels, workloads are packaged into Debian 12/13 LXC containers.

### Hardware Storage Tiering

Storage is logically segregated across physical media based on access latency, endurance, and capacity requirements:

1. **`local` (70 GB SSD)**: Host OS filesystem, kernel packages, and Debian standard container templates (`debian-13-standard`).
2. **`local-lvm` (148 GB Thin Pool)**: Fast random I/O storage dedicated to container root filesystems (`rootfs`). Supports thin provisioning, snapshot creation, and dynamic size expansion.
3. **`vault-media` (916 GB ext4 HDD)**: High-capacity magnetic storage for bulk datasets. Allocated via bind mounts and virtual disk images:
   - Bind mount `/mnt/pve/vault-media` -> `/mnt/storage` in CT104 (media library)
   - 200 GB raw disk image attached to CT101 -> `/mnt/photos` (Immich library)
   - 50 GB raw disk image attached to CT103 -> `/mnt/nextcloud-data` (Nextcloud storage)

### Container Resource Allocation Matrix

```
+-----+-------------------+-------+--------+-------+--------+--------------------------+-------------+
| CT  | Hostname          | Cores | RAM    | Swap  | Rootfs | Mounts                   | Privileged? |
+-----+-------------------+-------+--------+-------+--------+--------------------------+-------------+
| 100 | caddy-proxy       | 1     | 512 MB | 512MB | 4 GB   | None                     | Unpriv (1)  |
| 101 | immich-host       | 4     | 4096MB | 4096M | 20 GB  | vault-media:200G         | Priv (0)    |
| 102 | adguard-secondary | 1     | 512 MB | 512MB | 4 GB   | None                     | Unpriv (1)  |
| 103 | nextcloud-host    | 2     | 1024MB | 1024M | 10 GB  | vault-media:50G          | Priv (0)    |
| 104 | media-host        | 4     | 3072MB | 2048M | 15 GB  | /mnt/storage + /dev/dri  | Priv (0)    |
| 105 | dockhand-master   | 1     | 512 MB | 512MB | 4 GB   | None                     | Unpriv (1)  |
+-----+-------------------+-------+--------+-------+--------+--------------------------+-------------+
```

### Privilege Boundary Decisions

- **Unprivileged Containers (`unprivileged: 1`)**: Used for network-facing edge services (CT100 Caddy, CT102 AdGuard, CT105 Dockhand). Root inside the container is mapped to an unprivileged UID on the host (`UID 100000+`), mitigating container-escape vulnerabilities.
- **Privileged Containers (`unprivileged: 0`)**: Reserved exclusively for CT101 and CT104 where raw block device mounts (`vault-media`) and direct hardware character devices (`/dev/dri`) require native UID 0 mapping.

---

## Bare-Metal GPU Passthrough (Intel QuickSync)

One of the highlights of this homelab is real-time, hardware-accelerated video transcoding in Jellyfin (CT104) without dedicating a discrete PCIe GPU or running a heavyweight VM.

### Linux cgroup Character Device Whitelisting

To allow an LXC container direct access to the integrated Intel UHD graphics silicon, the host kernel character devices for DRM (Direct Rendering Manager) are mapped into container CT104's configuration (`/etc/pve/lxc/104.conf`):

```ini
# Intel QuickSync /dev/dri Hardware Passthrough
lxc.cgroup2.devices.allow: c 226:0 rwm
lxc.cgroup2.devices.allow: c 226:128 rwm
lxc.mount.entry: /dev/dri dev/dri none bind,optional,create=dir
```

- `c 226:0`: Major number 226, Minor 0 corresponds to `/dev/dri/card0` (primary display controller).
- `c 226:128`: Major number 226, Minor 128 corresponds to `/dev/dri/renderD128` (unprivileged render node used by VA-API and Intel QuickSync).
- Inside CT104, Jellyfin connects directly to `/dev/dri/renderD128`, offloading 4K 10-bit HEVC to H.264 transcoding entirely to the hardware silicon, keeping CPU consumption below 8% during multi-stream playback.

---

## Multi-Daemon Docker Orchestration & Production Discipline

Rather than operating a single Docker daemon across the hypervisor, Docker engines are isolated inside individual LXC nodes. Exactly 3 Docker daemons run on the network:

```
                  +-------------------------------+
                  | CT105: Dockhand Master UI     |
                  | URL: http://192.168.1.105:3000|
                  +---------------+---------------+
                                  |
         +------------------------+------------------------+
         | Local Socket           | Hawser Agent (:2376)   | Hawser Agent (:2376)
         V                        V                        V
+-----------------+      +-----------------+      +-----------------+
| CT105 (Local)   |      | CT101 (Immich)  |      | CT104 (Media)   |
| Dockhand Daemon |      | Docker Daemon   |      | Docker Daemon   |
+-----------------+      +-----------------+      +-----------------+
```

### 1. Centralized Management via Dockhand & Hawser Agents

- **CT105**: Hosts the **Dockhand** management platform (SvelteKit UI). Manages its own stack via native `/var/run/docker.sock`.
- **CT101 & CT104**: Run lightweight **Hawser** agents listening on TCP port `2376`. Dockhand communicates securely with Hawser to aggregate container states, image updates, and resource telemetry into a single unified console.

### 2. Immutable Deployments: SHA-256 Digest Pinning

In production environments, floating tags like `:latest` or `:16` can cause uncoordinated schema migrations and database corruption during automated pulls.

In the Immich stack (`/root/immich/docker-compose.yml`), stateful datastore services are pinned strictly to immutable **SHA-256 image digests**:

- **PostgreSQL**: Pinned by content hash to prevent major database upgrades without manual `pg_dump` migrations.
- **Valkey** (Container `immich_redis`): Pinned by SHA-256 digest to prevent unintended breaking changes from newer upstream builds.

### 3. Systems Tuning: OOM Prevention & Disk Cache Calibration

During high-throughput gigabit downloads in CT104, unconstrained torrent buffers caused rapid page-cache exhaustion, driving Linux memory pressure into kernel Out-Of-Memory (OOM) panics.

To remediate this:

1. **Memory Ceiling**: CT104 RAM was expanded from 2 GB to 3 GB with 2 GB swap (`pct set 104 -memory 3072 -swap 2048`).
2. **Explicit Cache Limit**: qBittorrent disk cache was capped at 256 MiB using its REST API (`/api/v2/app/setPreferences` setting `Session\DiskCacheSize=256`).
3. **Daemon Reload**: Docker daemon was bounced cleanly, enforcing stable 3 GiB limits across all media containers without memory creep.

---

## Zero-Trust Mesh Overlay (Tailscale WireGuard)

To allow seamless remote engineering access from anywhere in the world without opening public ports, all physical nodes join a private WireGuard mesh network (`100.68.1.0/24`).

```
                    ~~~~ TAILNET (100.68.1.0/24) ~~~~
                                    |
          .---------------+---------+---------+---------------.
          |               |                   |               |
    100.68.1.200    100.68.1.201        100.68.1.202    100.68.1.204
      archive          samsung               pi             vault
    (Accept Routes)  (Android Phone)     (Subnet Router) (Subnet Router +
                                         192.168.1.0/24   Exit Node 0.0.0.0/0)
```

### Redundant Subnet Routers

Both the bare-metal **Pi Zero 2 W** (`.202`) and the **Proxmox Hypervisor** (`.204`) advertise the local subnet prefix:

```bash
tailscale up --advertise-routes=192.168.1.0/24
```

If Proxmox undergoes maintenance, the Pi maintains continuous LAN route reachability for remote clients. If the Pi is disconnected, Proxmox routes the traffic.

### Split DNS, Tailnet Resolvers & Exit Node Persistence

To ensure seamless internal and external resolution across all mobile and workstation clients, Tailscale MagicDNS and custom nameservers are configured:

- **Tailnet Nameservers**: `100.68.1.202` (Pi Zero 2 W Tailscale node IP) and `192.168.1.102` (CT102 secondary AdGuard).
- **"Use with Exit Node" Flag**: Both resolvers have the "Use with Exit node" policy enabled in the Tailscale admin console. When mobile devices (such as the Samsung phone) route external traffic through the Mullvad exit node for public egress privacy, all DNS requests continue to route through AdGuard Home, ensuring zero ad/tracker leakage and retaining uninterrupted access to split-horizon LAN rewrites (`*.vault`, `*.archive`).
- **Subnet Route Acceptance**: Configured on client endpoints. The Samsung mobile phone has "Use Tailscale subnets" enabled (verified active 2026-09-19), allowing direct, seamless access to the `192.168.1.0/24` subnet from outside the home (with Thinkpad laptop pending configuration when next online).

---

## Disaster Recovery, Runbooks & SRE Discipline

True systems engineering is validated not when everything works, but during catastrophic failure. The network maintains an audited disaster recovery runbook detailing component recovery orders and declarative rebuild commands.

### Dependency Order Graph

Recovery follows a strict linear dependency hierarchy:

```
[ Router (DHCP/NAT) ]
        │
        ▼
[ Core DNS (Pi .202 / CT102 .102) ]
        │
        ▼
[ Tailscale Mesh Overlay ]
        │
        ▼
[ Caddy Ingress Proxy (CT100) ]
        │
        ▼
[ Application Daemons (CT101, CT104, CT105) ]
        │
        ▼
[ Bulk Storage Mounts (vault-media) ]
```

### Failure Mode & Effects Analysis (FMEA)

| Failed Component         | Blast Radius / System Impact                                 | Severity     | Recovery Procedure                                                                                                  |
| ------------------------ | ------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Pi Zero 2 W Dies**     | Primary DNS fails; 1 of 2 Tailscale subnet routes lost.      | **Low**      | Secondary DNS (`.102`) handles queries instantly. Re-flash SD card, restore `AdGuardHome.yaml` from backup sync.    |
| **CT100 (Caddy) Dies**   | Domain names fail (`502`). Direct IP access unaffected.      | **Low**      | Recreate CT100 (`pct create 100`), restore `/etc/caddy/Caddyfile`, restart systemd service.                         |
| **CT104 (Media) Dies**   | Jellyfin, qBittorrent, and Kavita offline.                   | **Medium**   | Recreate CT104, attach GPU `/dev/dri` rules, run `docker compose up -d` in `/root/media-stack`.                     |
| **Proxmox Host Dies**    | All 6 CTs down; secondary DNS down; primary DNS on Pi holds. | **High**     | Reinstall PVE 9.2.2, re-create storage pools (`local-lvm`, `vault-media`), execute declarative `pct create` script. |
| **vault-media HDD Dies** | Media and Immich library lost.                               | **Critical** | Single point of failure (documented in self-audit). Requires replacement drive and data restoration.                |

### Declarative Container Recreation Runbook

Every container can be reconstructed from scratch on a clean Proxmox host using deterministic CLI commands:

```bash
# 1. Edge Reverse Proxy (CT100)
pct create 100 local:vztmpl/debian-13-standard_amd64.tar.zst \
  --hostname caddy-proxy --memory 512 --swap 512 --cores 1 \
  --rootfs local-lvm:4 --net0 name=eth0,bridge=vmbr0,ip=192.168.1.100/24,gw=192.168.1.1,firewall=1 \
  --nameserver 192.168.1.202 --unprivileged 1 --features nesting=1

# 2. Media Host with GPU Passthrough (CT104)
pct create 104 local:vztmpl/debian-13-standard_amd64.tar.zst \
  --hostname media-host --memory 3072 --swap 2048 --cores 4 \
  --rootfs local-lvm:15 --net0 name=eth0,bridge=vmbr0,ip=192.168.1.104/24,gw=192.168.1.1,firewall=1 \
  --nameserver 192.168.1.202 --unprivileged 0 --features nesting=1,keyctl=1 \
  --mp0 /mnt/pve/vault-media,mp=/mnt/storage

# Append GPU character device bindings
cat << 'EOF' >> /etc/pve/lxc/104.conf
lxc.cgroup2.devices.allow: c 226:0 rwm
lxc.cgroup2.devices.allow: c 226:128 rwm
lxc.mount.entry: /dev/dri dev/dri none bind,optional,create=dir
EOF
```

### Configuration Backup Extraction Script

Critical configuration files are backed up securely off-host using automated `pct pull` commands:

```bash
# Execute on Proxmox host to backup state
pct pull 100 /etc/caddy/Caddyfile ./backups/Caddyfile
pct pull 101 /root/immich/docker-compose.yml ./backups/immich-compose.yml
pct pull 101 /root/immich/.env ./backups/immich.env
pct pull 104 /root/media-stack/docker-compose.yml ./backups/media-compose.yml
pct pull 104 /root/media-stack/qbit-config/qBittorrent/qBittorrent.conf ./backups/qbt.conf
pct pull 105 /root/dockhand/docker-compose.yml ./backups/dockhand-compose.yml
pct pull 102 /etc/adguardhome-sync.yaml ./backups/adguard-sync.yaml
```

---

## Technical Competencies Demonstrated

This setup serves as a practical demonstration of real-world infrastructure and systems engineering skills:

- **Network Engineering**: IPv4 CIDR subnet planning, split-horizon DNS design, DoH/DoT transport security, DNSSEC validation, NAT routing, and port-forward minimization.
- **Linux Systems Administration**: Debian systemd service management, kernel cgroup parameter tuning, storage volume management (LVM Thin Pools, ext4 block mounts), and SSH ed25519 key-based access control.
- **Virtualization & Hypervisors**: Proxmox VE clustering architecture, unprivileged vs. privileged container isolation, resource quota enforcement, and hardware device passthrough (`/dev/dri`).
- **Container Orchestration**: Multi-node Docker daemon topology, Compose multi-container networking, immutable SHA-256 image digest pinning, and resource footprint optimization.
- **Site Reliability & Disaster Recovery**: Dependency order modeling, failure mode and effects analysis (FMEA), automated state replication (`adguardhome-sync`), and reproducible declarative infrastructure runbooks.

---

## Live Audit & Verification History

- **2026-09-19**: Live DNS & Tailscale verification pass on bare-metal Pi. Confirmed Quad9 DoH/DoT as primary raced transports with Cloudflare designated as isolated `fallback_dns`. Updated Tailnet nameservers to `100.68.1.202` + `192.168.1.102` with "Use with Exit node" active for Mullvad traffic filtering. Verified Samsung mobile client has "Use Tailscale subnets" turned on for remote LAN access.
- **2026-09-08**: Storage audit & disaster-recovery kit compilation (`RECOVERY.md`). Calibrated CT104 RAM to 3GB and locked qBittorrent disk cache to 256 MiB to eliminate kernel page-cache thrashing.
- **2026-09-07**: Repository established as single source of truth; migrated Kavita to canonical GitHub container registry (`ghcr.io/kareadita/kavita`); pruned 6.7GB of reclaimable Docker container images; implemented SSH ed25519 key authentication hierarchy.
