// Starter content shown on first run. Everything here is sample data —
// replace it from the admin dashboard (/admin).
const crypto = require('crypto');

const id = () => crypto.randomBytes(6).toString('hex');
const withIds = (items) => items.map((item, order) => ({ id: id(), order, ...item }));

// `name` / `role` come from OWNER_NAME / OWNER_ROLE, which lets one codebase be deployed
// for several people (each deployment gets its own starter profile).
function content({ name, role } = {}) {
  const owner = String(name || '').trim().slice(0, 60) || 'Alex Carter';
  const job = String(role || '').trim().slice(0, 80) || 'Full Stack Developer';
  return {
    profile: {
      name: owner,
      role: job,
      headline:
        'I design, build and ship fast, scalable web products — from pixel-perfect interfaces to rock-solid APIs and cloud infrastructure.',
      roles: ['Web Apps', 'REST & GraphQL APIs', 'Dashboards', 'SaaS Products'],
      avatar: '',
      about:
        "I'm a full stack developer who loves turning complex problems into clean, intuitive products. I care about performance, accessibility and the small details that make software feel great to use.\n\nOn the front end I work with React and modern CSS; on the back end with Node.js, databases and cloud services. I enjoy owning a feature end to end — from the first sketch to production monitoring.",
      location: 'Cairo, Egypt',
      email: 'hello@example.com',
      phone: '',
      resume: '',
      available: true,
      availabilityText: 'Available for new projects',
    },
    settings: {
      siteTitle: `${owner} — ${job}`,
      description: `Portfolio of ${owner}, a ${job} building fast, scalable and beautiful web applications.`,
      accentFrom: '#8b7bff',
      accentTo: '#2fd4bd',
      defaultTheme: 'dark',
      footerText: 'Designed & built with care.',
      showAbout: true,
      showSkills: true,
      showServices: true,
      showProjects: true,
      showExperience: true,
      showCertificates: true,
      showContact: true,
    },
    stats: withIds([
      { label: 'Years of experience', value: 5, suffix: '+' },
      { label: 'Projects delivered', value: 40, suffix: '+' },
      { label: 'Happy clients', value: 25, suffix: '+' },
      { label: 'Cups of coffee', value: 999, suffix: '' },
    ]),
    socials: withIds([
      { platform: 'github', url: 'https://github.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
      { platform: 'twitter', url: 'https://x.com' },
    ]),
    skills: withIds([
      { name: 'React', category: 'Frontend', level: 92 },
      { name: 'TypeScript', category: 'Frontend', level: 88 },
      { name: 'Next.js', category: 'Frontend', level: 85 },
      { name: 'Tailwind CSS', category: 'Frontend', level: 90 },
      { name: 'Node.js', category: 'Backend', level: 90 },
      { name: 'Express / NestJS', category: 'Backend', level: 86 },
      { name: 'REST & GraphQL', category: 'Backend', level: 88 },
      { name: 'Authentication & Security', category: 'Backend', level: 80 },
      { name: 'PostgreSQL', category: 'Databases', level: 84 },
      { name: 'MongoDB', category: 'Databases', level: 86 },
      { name: 'Redis', category: 'Databases', level: 72 },
      { name: 'Docker', category: 'DevOps', level: 82 },
      { name: 'CI/CD', category: 'DevOps', level: 78 },
      { name: 'AWS', category: 'DevOps', level: 70 },
    ]),
    services: withIds([
      {
        title: 'Web Application Development',
        description: 'Custom, responsive web apps built with modern frameworks and clean, maintainable code.',
        icon: 'layout',
      },
      {
        title: 'API & Backend Engineering',
        description: 'Secure, well-documented REST and GraphQL APIs with the right database behind them.',
        icon: 'server',
      },
      {
        title: 'Dashboards & Admin Panels',
        description: 'Data-rich internal tools that make your team faster and your data easy to understand.',
        icon: 'database',
      },
      {
        title: 'Performance & Deployment',
        description: 'Docker, CI/CD and cloud hosting so your product ships fast and stays fast.',
        icon: 'rocket',
      },
    ]),
    projects: withIds([
      {
        title: 'Pulse Analytics',
        summary: 'Realtime analytics dashboard processing millions of events per day.',
        description:
          'A SaaS dashboard that ingests events over WebSockets and turns them into live charts, funnels and cohort reports.\n\nBuilt with a React front end, a Node.js ingestion service and PostgreSQL + Redis for storage and caching.',
        image: '',
        tags: ['React', 'Node.js', 'PostgreSQL', 'WebSockets'],
        liveUrl: 'https://example.com',
        repoUrl: 'https://github.com',
        featured: true,
      },
      {
        title: 'ShopFlow',
        summary: 'Headless e-commerce platform with a custom storefront and admin.',
        description:
          'A multi-vendor store with carts, payments, inventory and order tracking.\n\nIncludes a Next.js storefront, a Stripe integration and an admin panel for managing products and orders.',
        image: '',
        tags: ['Next.js', 'TypeScript', 'Stripe', 'MongoDB'],
        liveUrl: 'https://example.com',
        repoUrl: 'https://github.com',
        featured: true,
      },
      {
        title: 'TaskHive',
        summary: 'Collaborative project management with boards, comments and notifications.',
        description:
          'Kanban boards with drag & drop, real-time collaboration, role-based permissions and email notifications.',
        image: '',
        tags: ['React', 'NestJS', 'PostgreSQL', 'Docker'],
        liveUrl: '',
        repoUrl: 'https://github.com',
        featured: false,
      },
      {
        title: 'FitTrack Mobile',
        summary: 'Cross-platform fitness tracker with workout plans and progress charts.',
        description:
          'A React Native app backed by a Node.js API, with offline support, push notifications and detailed progress analytics.',
        image: '',
        tags: ['React Native', 'Node.js', 'Firebase'],
        liveUrl: '',
        repoUrl: 'https://github.com',
        featured: false,
      },
    ]),
    // Placeholder credentials with made-up issuers — replace with your real ones.
    certificates: withIds([
      {
        title: 'Full Stack Web Development',
        issuer: 'Online Academy',
        kind: 'certificate',
        date: 'Jun 2025',
        image: '',
        credentialUrl: 'https://example.com',
        credentialId: 'FS-2025-0481',
        skills: ['React', 'Node.js', 'MongoDB'],
      },
      {
        title: 'Advanced JavaScript & TypeScript',
        issuer: 'Code School',
        kind: 'course',
        date: 'Mar 2025',
        image: '',
        credentialUrl: '',
        credentialId: '',
        skills: ['TypeScript', 'ES2024', 'Testing'],
      },
      {
        title: 'Cloud & DevOps Fundamentals',
        issuer: 'Cloud Institute',
        kind: 'certificate',
        date: 'Jan 2025',
        image: '',
        credentialUrl: 'https://example.com',
        credentialId: 'CI-77120',
        skills: ['Docker', 'CI/CD', 'AWS'],
      },
      {
        title: 'University Hackathon — 1st Place',
        issuer: 'Cairo University',
        kind: 'award',
        date: 'Nov 2024',
        image: '',
        credentialUrl: '',
        credentialId: '',
        skills: ['Teamwork', 'Rapid prototyping'],
      },
    ]),
    experience: withIds([
      {
        kind: 'work',
        role: 'Senior Full Stack Developer',
        company: 'Nova Labs',
        period: '2023 — Present',
        description:
          'Lead the development of a multi-tenant SaaS platform used by thousands of teams. Introduced CI/CD, cut API response times by 40% and mentored a team of four developers.',
      },
      {
        kind: 'work',
        role: 'Full Stack Developer',
        company: 'Pixel & Co.',
        period: '2020 — 2023',
        description:
          'Built and shipped more than 20 client projects — e-commerce stores, booking systems and internal dashboards — using React, Node.js and MongoDB.',
      },
      {
        kind: 'work',
        role: 'Junior Web Developer',
        company: 'Freelance',
        period: '2018 — 2020',
        description: 'Delivered websites and small web apps for local businesses while learning the craft.',
      },
      {
        kind: 'education',
        role: 'B.Sc. in Computer Science',
        company: 'Cairo University',
        period: '2014 — 2018',
        description: 'Focused on software engineering, databases and distributed systems.',
      },
    ]),
  };
}

module.exports = { content, id };
