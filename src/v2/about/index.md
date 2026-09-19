---
layout: about.njk
permalink: /about/
title: 'Resume • Tasrif — IT & DevOps'
bodyClass: page--resume
pageId: resume
description: 'IT & DevOps student resume. View technical skills in Linux, automation, networking, and system administration.'

profile:
  name: Tasrif
  role: 'IT Infrastructure • DevOps • Security'
  eyebrow: '// RESUME & DOSSIER'
  avatar: /assets/img/profile.png
  badge: 'NYC • SYSTEMS'
  location: 'New York, NY'
  email: contact@tasrif.dev
  socials:
    - label: 'GitHub ↗'
      url: https://github.com/zephyr73
      icon: github
    - label: 'LinkedIn ↗'
      url: https://www.linkedin.com/in/yaseen-aar-rahman/
      icon: linkedin
    - label: 'Twitter / X ↗'
      url: https://twitter.com/Zephyr73_
      icon: twitter
  summary: >
    Computer Science student and IT enthusiast with hands-on expertise in Linux system
    administration, network protocols, and DevOps automation. Proven track record deploying 
    zero-trust VPNs, configuring high-availability Proxmox virtualization clusters, and 
    engineering robust Python/Bash automation daemons.
  bio:
    - >
      Computer Science undergraduate at <strong>Queens College (CUNY)</strong> (started Aug
      2026), having completed an Associate in Science in Computer Science at
      <strong>LaGuardia Community College</strong> (CGPA: 3.62, completed July 2026). Solid
      foundations in algorithmic problem solving, Cambridge University mathematics curriculum,
      and hands-on systems programming.
    - >
      Experienced in building highly-available Linux-based network infrastructure, Python 
      automation tools, and secure homelab environments. Passionate about systems architecture, 
      DevOps workflows, and continuous integration.
  meta:
    - label: Location
      value: 'New York, NY'
    - label: Status
      value: 'Open to Opportunities'
      accent: true
    - label: Focus
      value: 'Infrastructure & DevOps'

skills:
  - category: 'Infrastructure & Systems'
    items:
      - 'Linux System Administration'
      - 'Proxmox & Virtualization'
      - 'LXC Containers & Docker'
      - 'Infrastructure as Code (IaC)'
      - 'Disaster Recovery'
  - category: 'Security & Networking'
    items:
      - 'Networking & DNS'
      - 'Reverse Proxy & VPN'
      - 'Reverse Engineering'
  - category: 'DevOps & Automation'
    items:
      - 'Python & Bash'
      - 'PowerShell'
      - 'Git & GitHub'
      - 'CI/CD & IT Automation'
  - category: 'Data & Integration'
    items:
      - 'Web Scraping & APIs'
      - 'Browser Automation'
      - 'SQLite'
  - category: 'Other Interests'
    items:
      - 'Local LLMs'
      - 'Stable Diffusion / GenAI'
      - 'Photography (Lightroom/PS)'

projects:
  - title: 'High-Availability Homelab & Hybrid Network'
    url: /projects/home-network/
    date: 'Sep 19, 2026'
    tags:
      - 'Linux (Debian)'
      - 'Proxmox VE'
      - 'Docker'
      - 'WireGuard'
      - 'AdGuard Home'
      - 'Caddy'
    bullets:
      - >
        Architected and deployed a multi-node virtualized homelab hosting 10+ containerized
        network microservices across Proxmox VE and Docker, sustaining 99.9% local service
        uptime.
      - >
        Implemented dual-resolver redundant DNS architecture with AdGuard Home, executing
        sub-second failover between bare-metal Raspberry Pi hardware and virtualized LXC
        instances while blocking 150,000+ telemetry queries.
      - >
        Configured zero-trust WireGuard mesh overlay with automated failover routing,
        eliminating WAN exposure and enabling encrypted remote administration with sub-15ms
        latency.
  - title: 'WallpaperSync Real-Time Display & RGB Daemon'
    url: /projects/wallpapersync/
    date: 'Oct 27, 2023'
    tags:
      - Python
      - Watchdog
      - ColorThief
      - OpenRGB
      - Systemd
      - Bash
    bullets:
      - >
        Engineered an asynchronous Python system daemon that monitors desktop wallpaper changes
        in real time and synchronizes ambient RGB LED lighting across connected peripherals via
        OpenRGB.
      - >
        Integrated Watchdog filesystem observer and ColorThief algorithm with custom color
        filtering, computing dominant palette vectors within 120ms while filtering out
        near-white anomalies.
      - >
        Automated service management via systemd user units and Windows startup services,
        maintaining background execution with <1% CPU utilization across continuous multi-day
        cycles.
  - title: 'Interactive Virtual Desktop & Web Systems Platform'
    url: 'https://github.com/zephyr73/zephyr73.github.io'
    date: '2024 – Present'
    tags:
      - 'JavaScript (ES6+)'
      - Eleventy
      - Tailwind CSS
      - Web APIs
    bullets:
      - >
        Engineered a dual-mode portfolio static site and interactive virtual desktop SPA
        supporting draggable window management, custom theme engine, and simulated virtual
        filesystem.
      - >
        Developed a modular client-side terminal emulator supporting interactive Unix-like
        commands and process execution with zero external runtime frameworks.
      - >
        Optimized asset delivery pipeline with automated WebP image generation and minimal DOM
        trees, achieving 100/100 Google Lighthouse scores across performance and accessibility.

education:
  - degree: 'Bachelor of Science • Computer Science'
    institution: 'Queens College (CUNY) • Queens, NY'
    date: 'Started Aug 2026 • Present'
    badges:
      - text: 'Major: Computer Science'
      - text: 'Status: In Progress'
        accent: true
    desc: >
      Pursuing Bachelor of Science in Computer Science, deepening expertise in advanced data
      structures, algorithms, systems programming, and modern software engineering.
  - degree: 'Associate in Science • Computer Science'
    institution: 'LaGuardia Community College (CUNY) • Long Island City, NY'
    date: 'Graduated July 2026'
    badges:
      - text: 'Major: Computer Science'
      - text: 'CGPA: 3.62 / 4.0'
        accent: true
    desc: >
      Core coursework: Object-Oriented Programming (C++, Java), Data Structures &
      Algorithms, Computer Architecture, Discrete Mathematics, Linear Algebra, and Software
      Engineering.
  - degree: 'GCE Advanced Levels (A Levels)'
    institution: 'Sydney International School • Dhaka, Bangladesh'
    date: 'Graduated 2021'
    badges:
      - text: 'Cambridge Assessment International Education'
      - text: 'CGPA: 5.0 / 5.0'
        accent: true
    desc: 'Rigorous advanced curriculum with focus in Mathematics, Physics, and Computer Science.'
  - degree: 'GCE Ordinary Levels (O Levels)'
    institution: 'HURDCO International School • Dhaka, Bangladesh'
    date: 'Graduated 2019'
    hideInPrint: true
    badges:
      - text: 'CGPA: 4.16 / 5.0'
        accent: true
    desc: >
      Completed core subjects: Mathematics, Additional Mathematics, Physics, Computer Science,
      Chemistry, and English Language.
---

Beyond software engineering, I actively practice mobile photography with a Samsung Galaxy
S22 Ultra, post-processing RAW compositions in Adobe Lightroom. I also experiment with
latent diffusion models and local machine learning pipelines, testing ControlNet
architectures and custom inference workflows.
