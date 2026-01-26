import { createCssUtils } from "@real1ty-obsidian-plugins";

/**
 * CSS utilities for Nexus-Properties plugin.
 * Uses the shared factory with "nexus-properties-" prefix.
 */
const { cls, addCls, removeCls, toggleCls, hasCls } = createCssUtils("nexus-properties-");

export { cls, addCls, removeCls, toggleCls, hasCls };
