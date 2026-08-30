"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import GlassInput, { Field, GlassTextarea } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ToastProvider";
import PageHeader from "@/components/tracker/PageHeader";
import { useTracker } from "@/components/tracker/TrackerProvider";
import { createNote, deleteNote, updateNote } from "@/lib/tracker-client";
import { Note } from "@/lib/types";

export default function NotesPage() {
  const { toast } = useToast();
  const { notes, loading, refreshNotes } = useTracker();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Note | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(needle));
  }, [notes, query]);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setContent("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() && !content.trim()) {
      return setError("Add a title or some content first.");
    }

    setSaving(true);
    try {
      const payload = { title: title.trim() || "Untitled", content };
      if (editing) {
        await updateNote(editing.id, payload);
        toast({ title: "Note updated" });
      } else {
        await createNote(payload);
        toast({ title: "Note added" });
      }
      await refreshNotes();
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteNote(deleting.id);
      await refreshNotes();
      toast({ title: "Note deleted", description: deleting.title });
      setDeleting(null);
    } catch (err) {
      toast({
        title: "Could not delete this note",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Notes"
        eyebrow="Jottings"
        subtitle={
          loading ? undefined : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
        }
        actions={
          <GlassButton variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            New Note
          </GlassButton>
        }
      />

      <div className="mb-5 sm:max-w-md">
        <GlassInput
          icon={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={query ? "No notes match that search" : "No notes yet"}
          description={
            query
              ? "Try different words, or clear the search."
              : "Shopping lists, reminders, anything you want kept alongside your spending."
          }
          action={
            !query && (
              <GlassButton variant="primary" onClick={openAdd}>
                <Plus className="h-4 w-4" aria-hidden />
                New Note
              </GlassButton>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((note) => (
            <GlassCard as="li" key={note.id} interactive className="group flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 break-words text-base font-semibold tracking-tight text-text-primary">
                  {note.title}
                </h2>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(note)}
                    aria-label={`Edit ${note.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-text-primary/[0.06] hover:text-text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(note)}
                    aria-label={`Delete ${note.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              {note.content && (
                <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {note.content}
                </p>
              )}
            </GlassCard>
          ))}
        </ul>
      )}

      <GlassModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Note" : "New Note"}
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setFormOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              form="note-form"
              variant="primary"
              block
              disabled={saving}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Note"}
            </GlassButton>
          </div>
        }
      >
        <form id="note-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
          <Field label="Title" htmlFor="note-title">
            <GlassInput
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Things to buy"
              autoComplete="off"
            />
          </Field>

          <Field label="Content" htmlFor="note-content">
            <GlassTextarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"New running shoes\nSunscreen\nPhone case"}
              className="min-h-[180px]"
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
          )}
        </form>
      </GlassModal>

      <ConfirmDialog
        open={deleting !== null}
        destructive
        busy={deleteBusy}
        title="Delete this note?"
        description={
          deleting ? `"${deleting.title}" will be removed. This cannot be undone.` : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
