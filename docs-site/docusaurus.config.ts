import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Docusaurus config for Prisma Calendar docs

const config: Config = {
  title: 'Nexus Properties',
  tagline: 'Automated property management and interactive relationship visualization for Obsidian.',
  favicon: 'img/nexus-properties.png',

  // Set the production url of your site here
  url: 'https://Real1tyy.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/Nexus-Properties/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Real1tyy', // Usually your GitHub org/user name.
  projectName: 'Nexus-Properties', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  trailingSlash: false,

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/Real1tyy/Nexus-Properties/edit/main/docs-site/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        // Your docs are at '/' route
        docsRouteBasePath: '/',
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        highlightSearchTermsOnTargetPage: true,
        // Optional: Customize search placeholder
        searchBarShortcutHint: false,
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/nexus-properties.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Nexus Properties',
      logo: {
        alt: 'Nexus Properties Logo',
        src: 'img/nexus-properties.png',
        href: '/', // Fix: Make logo/title link to root
      },
      items: [
        {
          to: '/features/overview',
          label: 'Features',
          position: 'left',
        },
        {
          href: 'https://github.com/Real1tyy/Nexus-Properties',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Nexus Properties',
              to: '/',
            },
            {
              label: 'Installation',
              to: '/installation',
            },
            {
              label: 'Quick Start',
              to: '/quickstart',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Contributing & Support',
              to: '/contributing',
            },
            {
              label: 'GitHub Issues',
              href: 'https://github.com/Real1tyy/Nexus-Properties/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/Real1tyy/Nexus-Properties',
            },
            {
              label: 'Releases',
              href: 'https://github.com/Real1tyy/Nexus-Properties/releases',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'Sponsor on GitHub',
              href: 'https://github.com/sponsors/Real1tyy',
            },
            {
              label: 'Buy Me a Coffee',
              href: 'https://www.buymeacoffee.com/real1ty',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Nexus Properties`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
    // Disable search until properly configured
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_PUBLIC_API_KEY',
    //   indexName: 'nexus_properties',
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
