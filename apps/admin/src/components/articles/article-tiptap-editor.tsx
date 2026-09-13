import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import YouTube from "@tiptap/extension-youtube";
import { IconButton, Tooltip, Text } from "@medusajs/ui";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Play,
  RemoveFormatting,
} from "lucide-react";
import { useCallback, useState, useRef, useMemo, useEffect, type ChangeEvent } from "react";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { LanguageSwitch } from "../ui/medusa/localized-field";
import type { AdminLocale } from "../../types";
import { cn } from "../../lib/utils";

type ArticleTipTapEditorProps = {
  valueByLocale: Record<AdminLocale, { html: string; json: string | null }>;
  onChangeByLocale: (locale: AdminLocale, value: { html: string; json: string | null }) => void;
};

const EDITOR_PLACEHOLDERS: Record<AdminLocale, string> = {
  vi: "Bắt đầu viết nội dung bài viết của bạn...",
  en: "Start writing your article content...",
};

/** Swaps the editor content to the requested locale without clobbering the user's undo history while typing. */
function useEditorLocaleSync(
  editor: Editor | null,
  locale: AdminLocale,
  valueByLocale: Record<AdminLocale, { html: string; json: string | null }>,
) {
  useEffect(() => {
    if (!editor) return;
    const value = valueByLocale[locale];
    editor.commands.setContent(value.json ? (JSON.parse(value.json) as object) : value.html || "");
    // Only re-run when switching language; valueByLocale is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={title}>
      <IconButton
        variant={active ? "primary" : "transparent"}
        size="small"
        onClick={onClick}
        disabled={disabled}
        type="button"
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export function ArticleTipTapEditor({
  valueByLocale,
  onChangeByLocale,
}: ArticleTipTapEditorProps) {
  const [locale, setLocale] = useState<AdminLocale>("vi");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const localeRef = useRef(locale);
  const placeholderRef = useRef(EDITOR_PLACEHOLDERS.vi);
  localeRef.current = locale;

  const missingLocales = useMemo<AdminLocale[]>(() => {
    const missing: AdminLocale[] = [];
    const hasViContent = valueByLocale.vi.html.trim().length > 0;
    if (!hasViContent) missing.push("vi");
    if (hasViContent && !valueByLocale.en.html.trim()) missing.push("en");
    return missing;
  }, [valueByLocale]);

  const handleUploadImage = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setUploadError(null);
        const asset = await uploadProductVariantMedia(file);
        return asset.contentUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload thất bại";
        setUploadError(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        allowBase64: false,
        inline: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      YouTube.configure({
        controls: true,
        nocookie: true,
      }),
    ],
    content: valueByLocale.vi.json
      ? (JSON.parse(valueByLocale.vi.json) as object)
      : valueByLocale.vi.html || "",
    onUpdate: ({ editor }) => {
      onChangeByLocale(localeRef.current, {
        html: editor.getHTML(),
        json: JSON.stringify(editor.getJSON()),
      });
    },
    editorProps: {
      attributes: {
        class:
          "prose-article min-h-[420px] focus:outline-none",
      },
      handlePaste: (_, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            void insertFile(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) void insertFile(file);
        }
        return true;
      },
    },
  });

  placeholderRef.current = EDITOR_PLACEHOLDERS[locale];

  // Swap the editor content when the operator switches language
  useEditorLocaleSync(editor, locale, valueByLocale);

  const insertFile = async (file: File) => {
    const url = await handleUploadImage(file);
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void insertFile(file);
    e.target.value = "";
  };

  const addLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL liên kết:", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addYouTube = () => {
    const url = window.prompt("Nhập YouTube URL hoặc ID:");
    if (!url) return;
    editor?.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const exec = (fn: (e: Editor) => void) => {
    if (editor) fn(editor);
  };

  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base overflow-hidden">
      <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-subtle px-3 py-2">
        <Text size="small" weight="plus">Body</Text>
        <LanguageSwitch
          value={locale}
          onValueChange={setLocale}
          missingLocales={missingLocales}
          size="compact"
        />
      </div>

      <div className="flex items-center gap-x-1 border-b border-ui-border-base px-2 py-1.5 flex-wrap bg-ui-bg-subtle">
        <ToolbarButton title="Hoàn tác" onClick={() => exec((e) => e.chain().focus().undo().run())} disabled={!editor?.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Làm lại" onClick={() => exec((e) => e.chain().focus().redo().run())} disabled={!editor?.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-ui-border-base mx-1" />
        <ToolbarButton title="Đậm" active={editor?.isActive("bold")} onClick={() => exec((e) => e.chain().focus().toggleBold().run())}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Nghiêng" active={editor?.isActive("italic")} onClick={() => exec((e) => e.chain().focus().toggleItalic().run())}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Gạch ngang" active={editor?.isActive("strike")} onClick={() => exec((e) => e.chain().focus().toggleStrike().run())}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-ui-border-base mx-1" />
        <ToolbarButton title="Tiêu đề 1" active={editor?.isActive("heading", { level: 1 })} onClick={() => exec((e) => e.chain().focus().toggleHeading({ level: 1 }).run())}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Tiêu đề 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => exec((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Tiêu đề 3" active={editor?.isActive("heading", { level: 3 })} onClick={() => exec((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-ui-border-base mx-1" />
        <ToolbarButton title="Danh sách gạch đầu dòng" active={editor?.isActive("bulletList")} onClick={() => exec((e) => e.chain().focus().toggleBulletList().run())}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Danh sách đánh số" active={editor?.isActive("orderedList")} onClick={() => exec((e) => e.chain().focus().toggleOrderedList().run())}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Trích dẫn" active={editor?.isActive("blockquote")} onClick={() => exec((e) => e.chain().focus().toggleBlockquote().run())}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Mã nội tuyến" active={editor?.isActive("code")} onClick={() => exec((e) => e.chain().focus().toggleCode().run())}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Xóa định dạng" onClick={() => exec((e) => e.chain().focus().unsetAllMarks().run())}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-ui-border-base mx-1" />
        <ToolbarButton title="Liên kết" active={editor?.isActive("link")} onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Bảng" onClick={addTable}>
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Video YouTube" onClick={addYouTube}>
          <Play className="h-4 w-4" />
        </ToolbarButton>
        <label className="cursor-pointer">
          <Tooltip content={uploading ? "Đang tải lên..." : "Chèn ảnh"}>
            <IconButton variant="transparent" size="small" type="button" disabled={uploading}>
              <ImageIcon className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <input type="file" accept="image/*" className="hidden" onChange={onFileInput} disabled={uploading} />
        </label>
      </div>

      <div className={cn("px-4 py-3", uploading && "opacity-60 pointer-events-none")}>
        <EditorContent editor={editor} />
        {uploading ? (
          <Text size="xsmall" className="text-ui-fg-muted pt-2">
            Đang tải ảnh lên...
          </Text>
        ) : null}
        {uploadError ? (
          <Text size="xsmall" className="text-ui-fg-error pt-2">
            {uploadError}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
