import { createCssUtils } from "@real1ty-obsidian-plugins";

export const CSS_PREFIX = "nexus-properties-";

export const { cls, addCls, removeCls, toggleCls, hasCls } = createCssUtils(CSS_PREFIX);
