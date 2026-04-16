"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadImageToSupabase } from "@/lib/upload-image";
import { useCallback, useEffect } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface NotionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function NotionEditor({
  content,
  onChange,
  placeholder = "Escribe tus comentarios o pega tus gráficos acá...",
}: NotionEditorProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const handleImagePaste = useCallback(
    async (
      file: File | Blob,
      editor: ReturnType<typeof useEditor> | null
    ) => {
      if (!editor) return;
      try {
        const url = await uploadImageToSupabase(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Error uploading image:", err);
      }
    },
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        bold: {},
        italic: {},
        strike: {},
        code: {},
        codeBlock: {},
        blockquote: {},
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full my-2",
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: "text-blue-400 underline underline-offset-2 cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
      }),
    ],
    immediatelyRender: false,
    content: content || "",
    editorProps: {
      attributes: {
        class:
          "notion-editor min-h-[120px] max-h-[300px] overflow-y-auto outline-none px-3 py-2 text-sm leading-relaxed",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
              handleImagePaste(file, editor);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith("image/")) {
            event.preventDefault();
            handleImagePaste(files[i], editor);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  return (
    <>
      <div
        className="notion-editor-wrapper rounded-md border border-border bg-card/50 transition-colors focus-within:ring-1 focus-within:ring-ring"
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement | null;
          const img = target?.closest("img") as HTMLImageElement | null;
          if (img?.src) {
            setPreviewSrc(img.src);
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <Dialog
        open={previewSrc !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewSrc(null);
        }}
      >
        <DialogContent className="max-w-3xl w-[95vw] bg-card p-0 overflow-hidden">
          {previewSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-auto block"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
