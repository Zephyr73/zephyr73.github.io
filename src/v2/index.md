---
layout: layouts/home.njk
permalink: /
title: Tasrif — Backend & Systems Portfolio
bodyClass: page--home
pageId: home
noMarkdownWrapper: true
description: 'Portfolio of Tasrif — Computer Science student building backend systems, Linux automation, and self-hosted infrastructure.'

hero:
  prompt: 'tasrif@dev:~$ whoami'
  heading: 'CS student building backend systems, Linux tooling, and self-hosted infrastructure.'
  subtitle: 'I''m <strong class="text-body-text font-bold">Tasrif</strong>, an undergraduate at Queens College aiming for backend engineering. Outside class, I maintain a 5-node Debian LXC homelab on Proxmox with WireGuard and write small automation tools.'
  spec:
    focus: 'Backend APIs, Linux systems, networking & automation'
    status: 'Open to backend & systems internships'
  actions:
    - label: 'View Resume →'
      url: /about/
      primary: true
    - label: 'Projects'
      url: /projects/
    - label: 'GitHub ↗'
      url: https://github.com/zephyr73
      external: true

featuredProjectSlugs:
  - home-network
  - maltracker
  - wallpapersync

galleryPreview:
  - title: Photography
    desc: Architecture, cityscapes, and natural moments.
    url: /gallery/
    img: src/assets/img/photo.jpg
    alt: Urban and landscape photography
  - title: AI Generations
    desc: Latent space composition & diffusion studies.
    url: /gallery/#ai-container
    img: src/assets/img/ai.jpg
    alt: Stable Diffusion generative artwork

contact:
  heading: Get in touch
  subtitle: Open to backend / systems internships and technical chats.
  email: contact@tasrif.dev
---
