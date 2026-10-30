"use client";

import type { FormEvent } from "react";
import { useLanguage } from "./language-provider";
import { folderColorKeys } from "@/lib/folders/color-keys";
import type { TranslationKey } from "@/lib/i18n/types";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Archive,
  CalendarClock,
  Clock,
  FileText,
  Folder,
  Inbox,
  MailPlus,
  Plus,
  Pencil,
  Send,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessageCounts } from "@/hooks/use-message-counts";
import { AUTH_SESSION_CHANGED_EVENT, authFetch } from "@/lib/auth/client";
import { getMailboxFolders, invalidateFolderCache } from "@/lib/folders/client";
import { dispatchLabelsChanged, updateMessageLabels } from "@/lib/labels/client";
import type { LabelSummary } from "@/lib/labels/client-types";
import { useMailboxLabels } from "@/components/messages/use-mailbox-labels";
import {
  DEFAULT_FOLDER_COLOR,
  FOLDER_COLOR_OPTIONS,
} from "@/lib/folders/colors";
import type { FolderColor } from "@/lib/folders/types";
import { cn } from "@/lib/utils";
import { NavItem } from "./components-nav";
import type { NavLink } from "./components-nav-types";
import type { CustomFolder } from "./dashboard-nav-types";
import {
  getFolderNavCount,
  moveMessagesToCustomFolder,
  moveMessagesToSystemFolder,
} from "./dashboard-nav-utils";
import { NavSectionHeader, useSectionOpen } from "./nav-section-header";
import { ReorderableList } from "./reorderable-list";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";
import { SidebarScaffold } from "./sidebar-scaffold";
import { useSidebar } from "./sidebar-state";

const links = [
  { href: "/compose", labelKey: "navigation.compose", icon: MailPlus, primary: true },
  { href: "/inbox", labelKey: "navigation.inbox", icon: Inbox, preloadMessages: true },
  { href: "/starred", labelKey: "navigation.starred", icon: Star, preloadMessages: true },
  { href: "/snoozed", labelKey: "navigation.snoozed", icon: Clock, preloadMessages: true },
  { href: "/sent", labelKey: "navigation.sent", icon: Send, preloadMessages: true },
  { href: "/scheduled", labelKey: "navigation.scheduled", icon: CalendarClock, preloadMessages: true },
  { href: "/drafts", labelKey: "navigation.drafts", icon: FileText, preloadMessages: true },
  {
    href: "/archived",
    labelKey: "navigation.archived",
    icon: Archive,
    preloadMessages: true,
  },
  { href: "/spam", labelKey: "navigation.spam", icon: ShieldAlert, preloadMessages: true },
  { href: "/trash", labelKey: "navigation.trash", icon: Trash2, preloadMessages: true },
] satisfies (Omit<NavLink, "label"> & { labelKey: TranslationKey })[];


// Drafts, Archived, Spam and Trash always stay visible.
const MORE_LINK_HREFS = ["/drafts", "/archived", "/spam", "/trash"];

export function DashboardNav({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { minimal, mobile } = useSidebar();
  const pathname = usePathname();
  const [foldersSectionOpen, toggleFoldersSection] = useSectionOpen("mailflare:nav:folders-section-open");
  const { selectedMailbox, isLoading } = useSelectedMailbox();
  const { counts } = useMessageCounts(selectedMailbox?.id, !isLoading);
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] =
    useState<FolderColor>(DEFAULT_FOLDER_COLOR);
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const { labels } = useMailboxLabels(selectedMailbox?.id);
  const [labelsSectionOpen, toggleLabelsSection] = useSectionOpen("mailflare:nav:labels-section-open");
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelSummary | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<FolderColor>(DEFAULT_FOLDER_COLOR);
  const [labelParentId, setLabelParentId] = useState<string>("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState(false);
  const linksWithCounts: NavLink[] = links.filter((link) => link.href !== "/scheduled" || counts.folders.scheduled.total > 0).map(({ labelKey, ...rest }): NavLink => {
    const link = { ...rest, label: t(labelKey) };
    if (link.href === "/inbox") {
      return { ...link, count: getFolderNavCount("inbox", counts.folders) };
    }
    if (link.href === "/starred") {
      return { ...link, count: getFolderNavCount("starred", counts.folders) };
    }
    if (link.href === "/snoozed") {
      return { ...link, count: getFolderNavCount("snoozed", counts.folders) };
    }
    if (link.href === "/sent") {
      return { ...link, count: getFolderNavCount("sent", counts.folders) };
    }
    if (link.href === "/scheduled") {
      return { ...link, count: counts.folders.scheduled.total };
    }
    if (link.href === "/drafts") {
      return { ...link, count: getFolderNavCount("drafts", counts.folders) };
    }
    if (link.href === "/archived") {
      return {
        ...link,
        count: getFolderNavCount("archived", counts.folders),
        onMessageDrop: (messageIds: string[]) =>
          void moveMessagesToSystemFolder(messageIds, "archive"),
      };
    }
    if (link.href === "/spam") {
      return {
        ...link,
        count: getFolderNavCount("spam", counts.folders),
        onMessageDrop: (messageIds: string[]) =>
          void moveMessagesToSystemFolder(messageIds, "spam"),
      };
    }
    if (link.href === "/trash") {
      return {
        ...link,
        count: getFolderNavCount("trash", counts.folders),
        onMessageDrop: (messageIds: string[]) =>
          void moveMessagesToSystemFolder(messageIds, "trash"),
      };
    }
    return link;
  });

  useEffect(() => {
    const reset = () => setFolders([]);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, reset);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, reset);
  }, []);

  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const composeLink = linksWithCounts.find((link) => link.href === "/compose");
  const mainLinks = linksWithCounts.filter((link) => link.href !== "/compose" && !MORE_LINK_HREFS.includes(link.href!));
  const moreLinks = linksWithCounts.filter((link) => MORE_LINK_HREFS.includes(link.href!));
  useEffect(() => {
    if (!selectedMailbox?.id) {
      setFolders([]);
      return;
    }

    let cancelled = false;
    getMailboxFolders<{ folders?: CustomFolder[] }>(selectedMailbox.id)
      .then((data) => {
        if (!cancelled) setFolders(data.folders ?? []);
      })
      .catch(() => {
        if (!cancelled) setFolders([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMailbox?.id]);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMailbox?.id || !newFolderName.trim()) return;

    setAddingFolder(true);
    try {
      const response = await authFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: selectedMailbox.id,
          name: newFolderName,
          color: newFolderColor,
        }),
      });
      if (!response.ok) return;
      const folder = (await response.json()) as CustomFolder;
      invalidateFolderCache();
      setFolders((items) =>
        [...items, folder].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewFolderName("");
      setNewFolderColor(DEFAULT_FOLDER_COLOR);
      setFolderDialogOpen(false);
    } finally {
      setAddingFolder(false);
    }
  }

  function openCreateLabel() {
    setEditingLabel(null);
    setLabelName("");
    setLabelColor(DEFAULT_FOLDER_COLOR);
    setLabelParentId("");
    setLabelDialogOpen(true);
  }

  function openEditLabel(label: LabelSummary) {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color as FolderColor);
    setLabelParentId(label.parentId ?? "");
    setLabelDialogOpen(true);
  }

  // A label cannot nest under itself or its own descendants.
  function availableLabelParents(): LabelSummary[] {
    if (!editingLabel) return labels;
    const blocked = new Set<string>([editingLabel.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const label of labels) {
        if (label.parentId && blocked.has(label.parentId) && !blocked.has(label.id)) {
          blocked.add(label.id);
          grew = true;
        }
      }
    }
    return labels.filter((label) => !blocked.has(label.id));
  }

  async function saveLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMailbox?.id || !labelName.trim()) return;
    setSavingLabel(true);
    try {
      const response = await authFetch(editingLabel ? `/api/labels/${editingLabel.id}` : "/api/labels", {
        method: editingLabel ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: selectedMailbox.id,
          name: labelName.trim(),
          color: labelColor,
          parentId: labelParentId || null,
        }),
      });
      if (!response.ok) return;
      dispatchLabelsChanged();
      setLabelDialogOpen(false);
    } finally {
      setSavingLabel(false);
    }
  }

  async function deleteLabel() {
    if (!selectedMailbox?.id || !editingLabel) return;
    setDeletingLabel(true);
    try {
      const response = await authFetch(`/api/labels/${editingLabel.id}?mailboxId=${encodeURIComponent(selectedMailbox.id)}`, { method: "DELETE" });
      if (!response.ok) return;
      dispatchLabelsChanged();
      window.dispatchEvent(new Event("mailflare:messages-changed"));
      setLabelDialogOpen(false);
    } finally {
      setDeletingLabel(false);
    }
  }

  // Flat depth-first list: parents followed by children, alphabetized per level.
  const labelTree: { label: LabelSummary; depth: number }[] = [];
  {
    const byParent = new Map<string | null, LabelSummary[]>();
    for (const label of labels) {
      const list = byParent.get(label.parentId) ?? [];
      list.push(label);
      byParent.set(label.parentId, list);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    const walk = (parentId: string | null, depth: number) => {
      for (const label of byParent.get(parentId) ?? []) {
        labelTree.push({ label, depth });
        walk(label.id, depth + 1);
      }
    };
    walk(null, 0);
  }

  return (
    <SidebarScaffold className={className} header={<SidebarHeader href="/inbox" />} footer={<SidebarFooter />}>
      {composeLink && !mobile && <NavItem labelClassName="font-medium" link={composeLink} />}
      {minimal && <hr className="mx-6 my-2 border-neutral-200/70" />}
      <ReorderableList
        storageKey="mailflare:nav:layout"
        enabled={!minimal}
        lists={[
          { id: "main", items: mainLinks.map((link) => ({ id: link.href!, node: <NavItem link={link} /> })) },
          {
            id: "more",
            items: moreLinks.map((link) => ({ id: link.href!, node: <NavItem link={link} /> })),
          },
        ]}
      />
      {minimal && <hr className="mx-6 my-2 border-neutral-200/70" />}
      {!minimal && (
        <NavSectionHeader label={t("navigation.folders")} open={foldersSectionOpen} onToggle={toggleFoldersSection}>
          {selectedMailbox && (
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-blue-50 hover:text-blue-700"
                  aria-label={t("navigation.createFolder")}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("navigation.createFolder")}</DialogTitle>
                  <DialogDescription>
                    {t("navigation.folderDescription")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createFolder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">{t("navigation.folderName")}</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder={t("navigation.folderExample")}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("navigation.color")}</Label>
                    <div
                      className="flex flex-wrap gap-2"
                      role="radiogroup"
                      aria-label={t("navigation.folderColor")}
                    >
                      {FOLDER_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={newFolderColor === option.value}
                          aria-label={t(folderColorKeys[option.value])}
                          title={t(folderColorKeys[option.value])}
                          onClick={() => setNewFolderColor(option.value)}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            newFolderColor === option.value
                              ? "border-neutral-900 ring-2 ring-neutral-300 ring-offset-2"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: option.value }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={addingFolder || !newFolderName.trim()}
                  >
                    {addingFolder ? t("navigation.creating") : t("navigation.createFolder")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </NavSectionHeader>
      )}
      
      {!minimal && foldersSectionOpen && folders.length === 0 && (
        <div className="px-4 py-1.5 text-xs text-neutral-500">
          {t("navigation.noFolders")}
        </div>
      )}
      {(minimal || foldersSectionOpen) && <ReorderableList
        storageKey="mailflare:nav:layout:folders"
        enabled={!minimal}
        lists={[{
          id: "folders",
          items: folders.map((folder) => ({
            id: folder.id,
            node: (
              <NavItem
                wrap
                link={{
                  href: `/folders/${folder.id}`,
                  label: folder.name,
                  icon: Folder,
                  preloadMessages: true,
                  iconColor: folder.color,
                  count: counts.customFolders[folder.id]?.unread,
                  onMessageDrop: (messageIds: string[]) =>
                    void moveMessagesToCustomFolder(messageIds, folder.id),
                }}
              />
            ),
          })),
        }]}
      />}
      {!minimal && (
        <NavSectionHeader label={t("navigation.labels")} open={labelsSectionOpen} onToggle={toggleLabelsSection}>
          {selectedMailbox && (
            <button
              type="button"
              onClick={openCreateLabel}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-blue-50 hover:text-blue-700"
              aria-label={t("navigation.createLabel")}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </NavSectionHeader>
      )}
      {!minimal && labelsSectionOpen && labels.length === 0 && (
        <div className="px-4 py-1.5 text-xs text-neutral-500">
          {t("navigation.noLabels")}
        </div>
      )}
      {!minimal && labelsSectionOpen && labelTree.map(({ label, depth }) => (
        <div key={label.id} className="group/label relative" style={{ paddingLeft: depth * 14 }}>
          <NavItem
            wrap
            link={{
              href: `/labels/${label.id}`,
              label: label.name,
              icon: Tag,
              preloadMessages: true,
              iconColor: label.color,
              count: counts.customLabels?.[label.id]?.unread,
              onMessageDrop: (messageIds: string[]) =>
                void updateMessageLabels({ messageIds, addLabelIds: [label.id] }),
            }}
          />
          <button
            type="button"
            onClick={() => openEditLabel(label)}
            className="absolute right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-blue-50 hover:text-blue-700 group-hover/label:flex"
            aria-label={t("navigation.editLabel")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLabel ? t("navigation.editLabel") : t("navigation.createLabel")}</DialogTitle>
            <DialogDescription>{t("navigation.labelDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLabel} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="labelName">{t("navigation.labelName")}</Label>
              <Input
                id="labelName"
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
                placeholder={t("navigation.labelExample")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labelParent">{t("navigation.nestUnder")}</Label>
              <select
                id="labelParent"
                value={labelParentId}
                onChange={(event) => setLabelParentId(event.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">{t("navigation.noParent")}</option>
                {availableLabelParents().map((label) => (
                  <option key={label.id} value={label.id}>{label.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("navigation.color")}</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("navigation.folderColor")}>
                {FOLDER_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={labelColor === option.value}
                    aria-label={t(folderColorKeys[option.value])}
                    title={t(folderColorKeys[option.value])}
                    onClick={() => setLabelColor(option.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      labelColor === option.value
                        ? "border-neutral-900 ring-2 ring-neutral-300 ring-offset-2"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: option.value }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {editingLabel ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deletingLabel || savingLabel}
                  onClick={() => void deleteLabel()}
                >
                  {deletingLabel ? t("navigation.deleting") : t("common.delete")}
                </Button>
              ) : <span />}
              <Button type="submit" disabled={savingLabel || deletingLabel || !labelName.trim()}>
                {savingLabel ? t("navigation.saving") : editingLabel ? t("common.save") : t("navigation.createLabel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarScaffold>
  );
                            }
