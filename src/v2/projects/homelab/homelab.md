---
layout: base.njk
permalink: /projects/homelab/
title: Homelab Architecture
description: >-
  A self-hosted infrastructure ecosystem running Proxmox VE, multiple LXC containers, Tailscale mesh VPN, AdGuard Home, Jellyfin, and Immich — built with a Zero Trust security posture.
date: 2026-09-09
tags: project
bodyClass: page--project
pageId: project-homelab
---

# Homelab Architecture

A self-hosted infrastructure ecosystem running on a single mini PC, designed around the principles of **containerization, Zero Trust security, and high availability**. Every service runs in its own isolated environment; remote access is encrypted end-to-end; and nothing is exposed to the public internet unless intentional.

## Tech Stack

| Layer            | Technology              | Role                                                   |
| ---------------- | ----------------------- | ------------------------------------------------------ |
| Hypervisor       | Proxmox VE              | Hosts and manages all LXC containers                   |
| Containerization | LXC (Linux Containers)  | Isolated, single-purpose service environments          |
| Reverse Proxy    | Caddy                   | Internal TLS termination and traffic routing           |
| VPN Overlay      | Tailscale (WireGuard)   | Zero Trust mesh network across all devices             |
| DNS / Adblock    | AdGuard Home (dual)     | Network-wide DNS, primary on Pi + secondary on Proxmox |
| Media Server     | Jellyfin + QuickSync    | HW-accelerated video transcoding via Intel iGPU        |
| Photo Library    | Immich + PostgreSQL     | Self-hosted Google Photos alternative                  |
| Container Mgmt   | Dockhand                | Centralized Docker daemon management UI                |
| File Sync        | Syncthing               | Continuous P2P file synchronization                    |
| Privacy VPN      | Mullvad                 | Split-tunnel privacy for public internet traffic       |
| Hardware         | Dell OptiPlex (mini PC) | Low-power, always-on server host                       |

## Network Architecture

All services sit on a flat private LAN. A Tailscale overlay connects every device — desktop, laptop, phone, server — into a secure mesh. Two subnet routers (the Proxmox host and a Raspberry Pi Zero) expose the full LAN to the tailnet, so remote access to any internal service requires no port forwarding.

<pre class="mermaid">
flowchart TB
  subgraph WAN["Internet / WAN"]
    router["Router\n(only torrent ports forwarded)"]
  end

  subgraph vault["Proxmox Host — vault\n(Dell OptiPlex mini PC)"]
    ct100["caddy-proxy\nReverse Proxy :80/:443"]
    ct101["immich-host\nImmich + PostgreSQL + ML"]
    ct102["adguard-secondary\nAdGuard Home (synced)"]
    ct104["media-host\nJellyfin + qBittorrent + Kavita\n(Intel GPU passthrough)"]
    ct105["dockhand-master\nDocker management UI"]
  end

  subgraph lan["Local LAN devices"]
    archive["archive — Windows desktop\nGlance · Sunshine · Syncthing · SMB"]
    pi["pi — Raspberry Pi Zero 2 W\nAdGuard Home (primary DNS)"]
  end

  subgraph tailnet["Tailscale Mesh (overlay)"]
    tnode["All devices joined\nMagicDNS for name resolution\nSubnet routers: vault + pi\nExit node: vault"]
  end

  router --> ct100
  ct100 --> ct101
  ct100 --> ct104
  ct100 --> archive
  pi -- "DNS sync" --> ct102
  vault -.-> tailnet
  pi -.-> tailnet
  archive -.-> tailnet
</pre>

## Reverse Proxy Configuration

Caddy handles all internal routing. Each service gets a clean internal hostname. TLS is handled automatically by Caddy — including the Proxmox WebUI which uses a self-signed cert that Caddy bypasses with `tls_insecure_skip_verify`. There are no raw IPs or port numbers in any browser bookmark.

```caddy
# photos.vault → Immich container
http://photos.vault {
    reverse_proxy immich-host:2283
}

# jellyfin.vault → Jellyfin on media-host
http://jellyfin.vault {
    reverse_proxy media-host:8096
}

# books.vault → Kavita on media-host
http://books.vault {
    reverse_proxy media-host:5000
}

# vault.lan → Proxmox WebUI (self-signed cert)
https://vault.lan {
    reverse_proxy https://proxmox-host:8006 {
        transport http {
            tls_insecure_skip_verify
        }
    }
}
```

## Design Decisions

**Why LXC over full VMs?**  
Full VMs carry significant overhead — each one needs its own kernel, boot time, and memory allocation. LXC containers share the host kernel and start in milliseconds, making it practical to run six isolated environments on a single low-power mini PC without performance degradation.

**Why Caddy over Nginx?**  
Nginx requires manual TLS certificate management (`certbot`, cron jobs, renewal logic). Caddy handles TLS automatically with a declarative config file that reads like a routing table. The entire proxy config is under 30 lines and requires zero maintenance.

**Why Tailscale over self-managed WireGuard?**  
Raw WireGuard requires maintaining public keys, endpoint configs, and firewall rules on every peer. Tailscale abstracts this into an always-up mesh — any device added to the tailnet is immediately reachable by hostname (MagicDNS) from any other device, with no configuration changes needed on existing nodes.

**Why a dedicated Pi Zero for primary DNS?**  
DNS is the most critical network service — if it goes down, nothing resolves. The Pi Zero draws under 1W and is always on, making it the ideal always-on primary. The Proxmox container handles failover if the Pi is unreachable, and `adguardhome-sync` keeps the blocklists and rewrites identical between both instances.

**Why bind-mount the HDD directly into the media container?**  
Network-attached storage (NFS/SMB) introduces latency and an extra service dependency. A bind mount at the hypervisor level gives the media container direct, filesystem-speed access to the disk with no intermediary — important for Jellyfin which reads large video files continuously during playback.

## Challenges & Lessons Learned

**Intel GPU passthrough in LXC** is non-trivial. Unlike VMs, LXC containers share the host kernel, so the GPU device node (`/dev/dri/renderD128`) must be explicitly whitelisted in the container config and the `video` group GID mapped correctly inside the container. Getting QuickSync transcoding working required understanding cgroup device policies at the Proxmox level.

**DNS bootstrapping problem**: Tailscale uses DNS (MagicDNS) to resolve hostnames, but DNS itself runs on a device that is part of the tailnet. On cold boot, there is a brief window where Tailscale is not yet up and DNS resolution fails. The solution is to ensure the Pi Zero has a static LAN IP and configure devices to fall back to it by raw IP if the tailnet is unreachable.

**Docker inside LXC** requires `nesting=1` and appropriate AppArmor settings in the Proxmox container config. Without this, the Docker daemon fails silently or produces misleading permission errors. This cost significant debugging time and is not well-documented.

**Keeping documentation honest**: Network state drifts. Services get updated, IPs change, containers get rebuilt. I now maintain a verified `NETWORK.md` that is only updated alongside a live scan, plus separate visual diagrams. The discipline of keeping three documents in sync (source of truth, visual, and ASCII topology) taught me that documentation that isn't regularly verified becomes actively misleading.

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const isDark = !document.documentElement.classList.contains('light');
  mermaid.initialize({ startOnLoad: true, theme: isDark ? 'dark' : 'default', fontFamily: 'JetBrains Mono, monospace' });
</script>
