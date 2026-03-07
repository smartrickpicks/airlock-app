"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Eye,
  Pencil,
} from "lucide-react";
import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Sample contract content shown when no real document is loaded
// ---------------------------------------------------------------------------
const SAMPLE_CONTENT = `<h1>Master Service Agreement</h1>
<p>This Master Service Agreement ("<strong>Agreement</strong>") is entered into as of January 15, 2026 ("<strong>Effective Date</strong>") by and between <strong>Henderson Music Group, LLC</strong>, a Delaware limited liability company ("<strong>Client</strong>"), and <strong>Summit Publishing Partners, Inc.</strong>, a California corporation ("<strong>Service Provider</strong>").</p>
<h2>1. Services</h2>
<p>Service Provider agrees to perform the distribution and licensing services described in each Statement of Work ("<strong>SOW</strong>") executed by the parties (collectively, the "<strong>Services</strong>"). Each SOW shall be incorporated by reference into this Agreement upon execution.</p>
<h2>2. Territory &amp; Term</h2>
<p>Unless otherwise specified in the applicable SOW, the territory covered by this Agreement is <strong>Worldwide</strong>. The initial term shall commence on the Effective Date and continue for a period of <strong>three (3) years</strong>, unless earlier terminated in accordance with Section 9.</p>
<h2>3. Compensation</h2>
<p>Client shall pay Service Provider the fees set forth in each SOW. All invoices are due within <strong>Net 45</strong> days of receipt. Late payments shall accrue interest at the lesser of 1.5% per month or the maximum rate permitted by applicable law.</p>
<blockquote><p>Minimum Guarantee: Client guarantees a minimum annual payment of <strong>$500,000</strong> regardless of usage volumes, payable quarterly in equal installments.</p></blockquote>
<h2>4. Intellectual Property</h2>
<p>Each party retains all right, title, and interest in its own intellectual property. Service Provider grants Client a non-exclusive, non-transferable license to use the deliverables solely for Client's internal business purposes during the term of this Agreement.</p>
<h2>5. Confidentiality</h2>
<p>Each party agrees to maintain the confidentiality of the other party's Confidential Information using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care. This obligation survives termination for a period of <strong>five (5) years</strong>.</p>
<h2>6. Limitation of Liability</h2>
<p>In no event shall either party be liable for any indirect, incidental, special, or consequential damages. Each party's total aggregate liability under this Agreement shall not exceed the greater of:</p>
<ul><li>The total fees paid or payable in the twelve (12) months preceding the claim, or</li><li>$250,000 USD</li></ul>
<h2>7. Governing Law</h2>
<p>This Agreement shall be governed by the laws of the State of <strong>New York</strong>, without regard to its conflict of law provisions. Any disputes shall be resolved by binding arbitration administered by JAMS in New York, NY.</p>
<hr>
<p><em>This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements and understandings.</em></p>`;

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent-primary/15 text-accent-primary"
          : "text-text-muted hover:bg-surface-glass-highlight hover:text-text-primary",
        disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------
function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-surface-glass-border" />;
}

// ---------------------------------------------------------------------------
// TipTapViewer
// ---------------------------------------------------------------------------
interface TipTapViewerProps {
  content?: string;
  editable?: boolean;
  placeholder?: string;
  onUpdate?: (html: string) => void;
}

export default function TipTapViewer({
  content = SAMPLE_CONTENT,
  editable: initialEditable = false,
  placeholder = "Start writing…",
  onUpdate,
}: TipTapViewerProps) {
  const [isEditing, setIsEditing] = useState(initialEditable);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content,
    editable: isEditing,
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  const toggleEdit = useCallback(() => {
    setIsEditing((prev) => {
      editor?.setEditable(!prev);
      return !prev;
    });
  }, [editor]);

  return (
    <div className="flex flex-col rounded-xl border border-surface-glass-border bg-surface-glass shadow-2xl backdrop-blur-xl">
      {/* Top highlight line — glass edge effect */}
      <div className="h-px w-full rounded-t-xl bg-surface-glass-highlight" />

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-glass-border px-3 py-2">
        {/* Formatting tools — only meaningful in edit mode */}
        <div
          className={[
            "flex items-center gap-0.5 transition-opacity duration-150",
            isEditing ? "opacity-100" : "opacity-30 pointer-events-none",
          ].join(" ")}
        >
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            title="Bold"
          >
            <Bold size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            title="Italic"
          >
            <Italic size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCode().run()}
            active={editor?.isActive("code")}
            title="Inline code"
          >
            <Code size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor?.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor?.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor?.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            title="Bullet list"
          >
            <List size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            title="Ordered list"
          >
            <ListOrdered size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo"
          >
            <Undo size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo"
          >
            <Redo size={13} />
          </ToolbarButton>
        </div>

        {/* View / Edit toggle */}
        <button
          onClick={toggleEdit}
          className={[
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            isEditing
              ? "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25"
              : "text-text-muted hover:bg-surface-glass-highlight hover:text-text-primary",
          ].join(" ")}
        >
          {isEditing ? (
            <>
              <Eye size={12} />
              Preview
            </>
          ) : (
            <>
              <Pencil size={12} />
              Edit
            </>
          )}
        </button>
      </div>

      {/* Document content */}
      <div className="tiptap-content overflow-y-auto px-8 py-7">
        <EditorContent editor={editor} />
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-surface-glass-border px-4 py-2">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {isEditing ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-primary" />
              Editing
            </span>
          ) : (
            "Read only"
          )}
        </span>
        <span className="text-[10px] text-text-muted">
          {editor?.storage.characterCount?.characters?.() ?? ""} chars
        </span>
      </div>
    </div>
  );
}
