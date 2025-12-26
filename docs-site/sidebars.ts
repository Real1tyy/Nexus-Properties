import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Nexus Properties"
    },
    "installation",
    "quickstart",
    "videos",
    "screenshots",
    {
      type: "category",
      label: "Features",
      collapsible: true,
      items: [
        "features/overview",
        "features/bidirectional-sync",
        "features/graph-views",
        "features/node-layout",
        "features/color-rules",
        "features/filtering",
        "features/zoom-mode",
        "features/tooltips",
        "features/context-menus",
        "features/node-creation",
        "features/excluded-properties",
        "features/bases-view"
      ]
    },
    "hotkeys",
    "configuration",
    "faq",
    "troubleshooting",
    "contributing",
    "support",
    "changelog"
  ]
};

export default sidebars;
