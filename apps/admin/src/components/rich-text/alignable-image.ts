import { Image } from "@tiptap/extension-image";

export type ImageAlign = "left" | "center" | "right";

export const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element) => {
          const className = element.getAttribute("class") ?? "";
          if (className.includes("align-center")) return "center";
          if (className.includes("align-right")) return "right";
          if (className.includes("align-left")) return "left";
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return { class: `align-${attributes.align}` };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: ImageAlign | "justify") =>
        ({ commands, editor }) => {
          if (!editor.isActive("image")) return false;
          const value: ImageAlign = align === "justify" ? "center" : align;
          return commands.updateAttributes("image", { align: value });
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    alignableImage: {
      setImageAlign: (align: ImageAlign | "justify") => ReturnType;
    };
  }
}