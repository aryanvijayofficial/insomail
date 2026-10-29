"use client";

import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Archive, ChevronLeft, ChevronRight, ListFilter, Mail, MailOpen, RefreshCw, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { useMailSearch } from "@/components/mail-search/mail-search-context";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { usePageLoading } from "@/components/page-loading";
import { formatScheduledSendTime } from "./scheduled-send-utils";
import { useIsMobile } from "@/components/sidebar-mobile-utils";
import { useMessageCounts } from "@/hooks/use-message-counts";
import { useMessages } from "@/hooks/use-messages";
import { updateMessageLabels } from "@/lib/labels/client";
import { LabelChips } from "./label-chips";
import { useMailboxLabels } from "./use-mailbox-labels";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { Message } from "@/hooks/types";
import { setMessageDragData } from "@/lib/messages/drag-utils";
import { BulkActionFeedback } from "./bulk-action-feedback";
import { BulkMessageToolbar } from "./bulk-message-toolbar";
import { SwipeableRow } from "./swipeable-row";
import { MessageListRowActions } from "./message-list-row-actions";
import { dispatchMessageCountsDelta, toggleMessageStar } from "./message-list-row-actions-utils";
import { MessageNavigationProgress, useMessageNavigation } from "./message-navigation";
import { rememberOpenedUnreadMessage } from "./message-detail-navigation-utils";
import { useConversationView } from "./use-conversation-view";
import { OpenedIndicator } from "./message-open-status";
import type { MessageFolderPageProps, MessageListRowProps, RowMessageAction } from "./types";
import {
	formatMessageListTimestamp,
	getPageRange,
	getMessageParty,
	getMessagePartyClassName,
	getMessagePreview,
	getUnreadFlipCount,
	isMessageListRowUnread,
	formatEmailPageTitle,
	getMailboxAddress,
	runBulkMessageAction,
	emptyMessageFolder,
} from "./utils";
import {
	getEmptyFolderConfirmText,
	getEmptyFolderLabel,
	getPermanentDeleteFolderLabel,
	getPermanentDeleteConfirmText,
	PartialDeleteError,
	supportsPermanentDelete,
} from "@/lib/messages/permanent-delete-utils";
import clsx from "clsx";
import { DueFollowUps } from "@/components/follow-ups/due-follow-ups";

const pageSize = 25;

function MessageListRow({
	message,
	config,
	selected,
	active = false,
	compact = false,
	currentAccountName,
	onSelectedChange,
	onMessageAction,
	dragMessageIds,
	labelsById,
}: MessageListRowProps) {
	const { t } = useLanguage();
	const Icon = config.icon;
	const [read, setRead] = useState(message.read);
	const [threadUnread, setThreadUnread] = useState(message.threadUnread);
	const [starred, setStarred] = useState(message.starred);
	useEffect(() => setRead(message.read), [message.read]);
	useEffect(() => setThreadUnread(message.threadUnread), [message.threadUnread]);
	useEffect(() => setStarred(message.starred), [message.starred]);
	const rowMessage = { ...message, read, starred, threadUnread };
	const unread = isMessageListRowUnread(rowMessage);
	const draggable = config.folder === "inbox" && message.direction === "inbound";
	const party = getMessageParty(rowMessage, config.folder, currentAccountName, t);
	const preview = getMessagePreview(rowMessage, config.folder, t);
	const href = `${config.hrefPrefix}/${message.id}`;
	const navigation = useMessageNavigation(href, rowMessage);

	const affectsInboxCount = config.folder === "inbox" && !config.folderId && !config.labelId;

	async function runRowAction(action: RowMessageAction) {
		const previousRead = read;
		const previousThreadUnread = threadUnread;
		const unreadDelta = !affectsInboxCount || (action !== "read" && action !== "unread")
			? 0
			: getUnreadFlipCount(rowMessage, action === "read") * (action === "read" ? -1 : 1);
		if (action === "read") setRead(true);
		if (action === "unread") setRead(false);
		// Grouped rows derive their unread styling from the thread count, so it must change with the row.
		if (message.threadMessageIds) {
			if (action === "read") setThreadUnread(0);
			if (action === "unread") setThreadUnread(message.threadMessageIds.length);
		}
		if (unreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta: unreadDelta });
		try {
			await onMessageAction(message.id, action);
		} catch (error) {
			if (action === "read" || action === "unread") {
				setRead(previousRead);
				setThreadUnread(previousThreadUnread);
				if (unreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta: -unreadDelta });
			}
			throw error;
		}
	}

	const swipeable = compact && (config.folder === "inbox" || config.folder === "snoozed") && message.direction === "inbound";

	function onMessageNavigate(event: MouseEvent<HTMLAnchorElement>) {
		if (!read && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
			rememberOpenedUnreadMessage(message.id);
			const previousThreadUnread = threadUnread;
			setRead(true);
			if (previousThreadUnread !== undefined) setThreadUnread(Math.max(0, previousThreadUnread - 1));
			if (affectsInboxCount && message.direction === "inbound") dispatchMessageCountsDelta({ inboxUnreadDelta: -1 });
			void runBulkMessageAction([message.id], "read", false).catch(() => {
				setRead(false);
				setThreadUnread(previousThreadUnread);
				if (affectsInboxCount && message.direction === "inbound") dispatchMessageCountsDelta({ inboxUnreadDelta: 1 });
			});
		}
		navigation.onNavigate(event, !read);
	}

	if (compact) {
		const compactRow = (
			<div
				role={swipeable ? undefined : "listitem"}
				className={`group grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-l-2 px-4 py-3 transition-colors ${active
					? "border-l-blue-600 bg-blue-50"
					: selected
						? "border-l-transparent bg-neutral-50"
						: "border-l-transparent hover:bg-neutral-50"
					} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
				draggable={draggable}
				onDragStart={(event) => {
					if (!draggable) return;
					setMessageDragData(event.dataTransfer, { messageIds: dragMessageIds });
				}}
			>
				<MessageNavigationProgress progress={navigation.progress} />
				<Checkbox
					checked={selected}
					onChange={(event) => onSelectedChange(message.id, event.target.checked)}
					className="mt-1 h-4 w-4 rounded border-neutral-300"
					aria-label={t("list.selectFrom", { sender: party })}
				/>
				<Link href={href} onClick={config.folder === "drafts" ? undefined : onMessageNavigate} aria-current={active ? "true" : undefined} className="min-w-0">
					<span className="flex items-baseline justify-between gap-3">
						<span className={clsx(unread && "font-semibold",getMessagePartyClassName(rowMessage, config.folder))}>
							{unread && <span className="sr-only">{t("list.unread")} </span>}
							{party}

							{(message.threadCount ?? 1) > 1 && (
								<span className="ml-2 text-xs font-normal text-neutral-500">{message.threadCount}</span>
							)}
						</span>
						<span className={clsx(unread ?"font-medium":"text-neutral-500","shrink-0 text-[11px]")}>
							<OpenedIndicator count={message.openCount} />
							{message.scheduledAt ? formatScheduledSendTime(message.scheduledAt, t) : formatMessageListTimestamp(message.createdAt)}
						</span>
					</span>
					<span
						className={`mt-1 block truncate text-sm ${unread ? "font-semibold text-neutral-900" : "text-neutral-700"
							}`}
					>
						{message.subject ?? t("list.noSubject")}
					</span>
					<span className="mt-0.5 block truncate text-xs leading-5 text-neutral-500">
						{preview}
					</span>
					<LabelChips labelIds={message.labelIds} labelsById={labelsById} className="mt-0.5" />
				</Link>
			</div>
		);
		if (!swipeable) return compactRow;
		return (
			<SwipeableRow
				role="listitem"
				startAction={{
					label: read ? t("list.markUnread") : t("list.markRead"),
					icon: read ? Mail : MailOpen,
					className: "bg-blue-600",
					onTrigger: () => void runRowAction(read ? "unread" : "read").catch(() => undefined),
				}}
				endAction={{
					label: t("common.archive"),
					icon: Archive,
					className: "bg-emerald-600",
					onTrigger: () => void runRowAction("archive").catch(() => undefined),
				}}
			>
				{compactRow}
			</SwipeableRow>
		);
	}

	const className =
		`group relative grid min-h-12 w-full grid-cols-[24px_32px_minmax(160px,80px)_1fr_auto] items-center gap-3 px-6 text-left text-sm hover:z-10 hover:bg-[#f2f6fc] hover:shadow-sm has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-blue-600 ${active || selected ? "bg-blue-50" : ""
		} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`;
	const content = (
		<>
			{config.folder === "inbox" && message.direction === "inbound" && (
				<Tooltip label={starred ? t("list.starred") : t("list.notStarred")}>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="relative z-10"
						onClick={() => {
							void toggleMessageStar(message.id).then((result) => setStarred(result.starred));
						}}
						aria-label={t("message.star")}
						aria-pressed={starred}
					>
						<Icon className={`h-4 w-4 ${starred ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
					</Button>
				</Tooltip>
			)}
			{(config.folder !== "inbox" || message.direction !== "inbound") && (
				<Icon className="h-4 w-4 text-neutral-300" />
			)}
			<span className={clsx(unread && "font-semibold", getMessagePartyClassName(rowMessage, config.folder))}>
				{unread && <span className="sr-only">{t("list.unread")} </span>}
				{party}

				{(message.threadCount ?? 1) > 1 && (
					<span className="ml-2 text-xs text-neutral-500">{message.threadCount}</span>
				)}
			</span>
			<span className="truncate text-neutral-700">
				<Link
					href={href}
					onClick={config.folder === "drafts" ? undefined : onMessageNavigate}
					aria-current={active ? "true" : undefined}
					className="focus-visible:outline-none after:absolute after:inset-0"
				>
					<span className={unread ? "font-semibold text-neutral-900" : ""}>
						{rowMessage.subject ?? t("list.noSubject")}
					</span>
					<span className="text-neutral-500"> - {getMessagePreview(rowMessage, config.folder, t)}</span>
					<LabelChips labelIds={message.labelIds} labelsById={labelsById} className="ml-2" />
				</Link>
			</span>
			<time
				dateTime={message.createdAt}
				className={`min-w-[96px] whitespace-nowrap text-right text-xs group-hover:opacity-0 ${unread ? "font-semibold text-neutral-800" : "text-neutral-500"
					}`}
			>
				<OpenedIndicator count={message.openCount} />
				{message.scheduledAt ? formatScheduledSendTime(message.scheduledAt, t) : formatMessageListTimestamp(message.createdAt)}
			</time>
		</>
	);

	if (config.folder === "drafts") {
		return (
			<div role="listitem" className={className}>
				<Checkbox
					checked={selected}
					onChange={(event) => onSelectedChange(message.id, event.target.checked)}
					className="relative z-10 h-4 w-4 rounded border-neutral-300"
					aria-label={t("list.selectMessage")}
				/>
				{content}
			</div>
		);
	}

	return (
		<div
			role="listitem"
			className={className}
			draggable={draggable}
			onDragStart={(event) => {
				if (!draggable) return;
				setMessageDragData(event.dataTransfer, { messageIds: dragMessageIds });
			}}
		>
			<MessageNavigationProgress progress={navigation.progress} />
			<Checkbox
				checked={selected}
				onChange={(event) => onSelectedChange(message.id, event.target.checked)}
				className="relative z-10 h-4 w-4 rounded border-neutral-300"
				aria-label={t("list.selectFrom", { sender: party })}
			/>
			{content}
			{(config.folder === "inbox" || config.folder === "snoozed") && message.direction === "inbound" && (
				<MessageListRowActions
					message={rowMessage}
					onAction={runRowAction}
				/>
			)}
		</div>
	);
}

export function MessageFolderPage({
	config,
	compact = false,
	selectedMessageId,
	selection,
}: MessageFolderPageProps) {
	const { t } = useLanguage();
	const {confirm, confirmationDialog} = useConfirmDialog();
	const title = config.titleKey ? t(config.titleKey) : config.title;
	const { selectedMailbox, isLoading: mailboxesLoading } = useSelectedMailbox();
	const { query } = useMailSearch();
	const isMobile = useIsMobile();
	const [offset, setOffset] = useState(0);
	const [internalSelectedMessages, setInternalSelectedMessages] = useState<
		Array<{ id: string; read: boolean }>
	>([]);
	const [pendingBulkAction, setPendingBulkAction] = useState(false);
	const bulkActionLock = useRef(false);
	const [bulkStatus, setBulkStatus] = useState<string | null>(null);
	const [emptyingFolder, setEmptyingFolder] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [conversationView] = useConversationView();
	const grouped = conversationView && config.folder !== "drafts";
	const { messages, isLoading, isRefreshing, refresh, total, limit, updateMessages } = useMessages(config.folder, selectedMailbox?.id, {
		query,
		limit: pageSize,
		offset,
		read: unreadOnly ? "unread" : "all",
		group: grouped ? "thread" : undefined,
	}, !mailboxesLoading, config.folderId, config.labelId);
	const { counts } = useMessageCounts(selectedMailbox?.id, !mailboxesLoading);
	const { labelsById } = useMailboxLabels(selectedMailbox?.id);
	usePageLoading(mailboxesLoading || isLoading);
	const headerIcons = config.headerIcons ?? [];
	const hasActiveFilters = !!query.trim();
	const folderCount = config.labelId
		? counts.customLabels?.[config.labelId]
		: config.folderId
			? counts.customFolders[config.folderId]
			: counts.folders[config.folder];
	const titleTotal = folderCount?.total ?? total;
	const titleUnread = folderCount?.unread ?? 0;
	const mailboxAddress = getMailboxAddress(selectedMailbox);
	const currentAccountName = selectedMailbox?.displayName ?? selectedMailbox?.localPart;
	const pageRange = getPageRange(offset, messages.length, total);
	const selectedMessages = selection?.selectedMessages ?? internalSelectedMessages;
	const setSelectedMessages =
		selection?.setSelectedMessages ?? setInternalSelectedMessages;
	const selectedIds = useMemo(
		() => selectedMessages.map((message) => message.id),
		[selectedMessages],
	);
	const hasUnreadSelection = selectedMessages.some((message) => !message.read);
	const allVisibleSelected = messages.length > 0 && messages.every((message) => selectedIds.includes(message.id));
	// In conversation view a row stands for every message of its thread in this
	// folder, so actions and drags carry all of them.
	const rowMessageIds = (message: Message) => message.threadMessageIds ?? [message.id];
	const expandSelectedIds = (ids: string[]) =>
		ids.flatMap((id) => rowMessageIds(messages.find((message) => message.id === id) ?? { id } as Message));

	useEffect(() => {
		setOffset(0);
		setSelectedMessages([]);
	}, [query, selectedMailbox?.id, config.folder, config.folderId, config.labelId, unreadOnly, grouped]);

	useEffect(() => {
		setSelectedMessages([]);
	}, [offset]);

	useEffect(() => {
		const originalTitle = document.title;
		return () => {
			document.title = originalTitle;
		};
	}, []);

	useEffect(() => {
		if (mailboxesLoading) return;
		document.title = formatEmailPageTitle({
			location: title,
			inbox: config.folder === "inbox" && !config.folderId && !config.labelId,
			total: titleTotal,
			unread: titleUnread,
			emailAddress: mailboxAddress,
		});
	}, [title, config.folder, config.folderId, config.labelId, mailboxAddress, mailboxesLoading, titleTotal, titleUnread]);

	useEffect(() => {
		if (isLoading) return;
		setSelectedMessages((current) => {
			const remaining = current.filter((item) => messages.some((message) => message.id === item.id));
			return remaining.length === current.length ? current : remaining;
		});
	}, [messages, isLoading]);

	useEffect(() => {
		if (isLoading || offset === 0 || messages.length > 0) return;
		setOffset(total > 0 ? Math.floor((total - 1) / limit) * limit : 0);
	}, [isLoading, offset, messages.length, total, limit]);

	function updateSelectedMessage(messageId: string, selected: boolean) {
		const message = messages.find((item) => item.id === messageId);
		if (!message) return;

		setSelectedMessages((current) => {
			if (!selected) return current.filter((item) => item.id !== messageId);
			if (current.some((item) => item.id === messageId)) return current;
			return [...current, { id: message.id, read: message.read && !(message.threadUnread ?? 0) }];
		});
	}

	function toggleAllVisible(selected: boolean) {
		const visibleIds = new Set(messages.map((message) => message.id));
		setSelectedMessages((current) => {
			if (!selected) {
				return current.filter((message) => !visibleIds.has(message.id));
			}

			const next = new Map(current.map((message) => [message.id, message]));
			for (const message of messages) {
				next.set(message.id, { id: message.id, read: message.read && !(message.threadUnread ?? 0) });
			}
			return Array.from(next.values());
		});
	}

	const permanentDeleteFolder = !config.folderId && supportsPermanentDelete(config.folder) ? config.folder : null;
	async function emptyFolder() {
		if (!permanentDeleteFolder || !selectedMailbox?.id) return;
		const mailboxId = selectedMailbox.id;
		const folder = permanentDeleteFolder;
		await confirm({title:getEmptyFolderLabel(folder,t), description:getEmptyFolderConfirmText(folder,titleTotal,t), confirmLabel:getEmptyFolderLabel(folder,t), action:async()=>{
			setEmptyingFolder(true);
			try { await emptyMessageFolder(mailboxId,folder); setOffset(0); }
			catch { throw new Error(t("list.emptyFailed",{folder:getPermanentDeleteFolderLabel(folder,t)})); }
			finally {setEmptyingFolder(false);}
		}});
	}

	useEffect(() => {
		if (!actionError) return;
		const timer = setTimeout(() => setActionError(null), 6000);
		return () => clearTimeout(timer);
	}, [actionError]);

	async function applyLabelToSelection(labelId: string) {
		setActionError(null);
		setPendingBulkAction(true);
		try {
			await updateMessageLabels({ messageIds: expandSelectedIds(selectedIds), addLabelIds: [labelId] });
			setSelectedMessages([]);
		} catch {
			setActionError(t("list.actionFailed"));
		} finally {
			setPendingBulkAction(false);
		}
	}

	async function runSelectedActionReportingErrors(action: BulkMessageAction, folderId?: string) {
		if (bulkActionLock.current) return;
		bulkActionLock.current = true;
		setActionError(null);
		setBulkStatus(null);
		try {
			await runSelectedAction(action, folderId);
		} catch (error) {
			setBulkStatus(null);
			setActionError(error instanceof PartialDeleteError ? t("actions.error.deleteSkipped") : t("actions.error.update"));
		} finally {
			bulkActionLock.current = false;
		}
	}

	async function runSelectedAction(action: BulkMessageAction, folderId?: string) {
		if (selectedIds.length === 0) return;
		if (action === "delete") {
			const ids = expandSelectedIds(selectedIds);
			if (!await confirm({title:t("common.deleteForever"),description:getPermanentDeleteConfirmText(ids.length,t),confirmLabel:t("common.deleteForever")})) return;
		}

		setBulkStatus(action === "delete" ? t("mailbox.deleting") : t("common.processing"));
		setPendingBulkAction(true);
		const previousMessages = messages;
		const readValue = action === "read" ? true : action === "unread" ? false : null;
		const inboxUnreadDelta = readValue === null || config.folder !== "inbox" || config.folderId
			? 0
			: messages
				.filter((message) => selectedIds.includes(message.id))
				.reduce((total, message) => total + getUnreadFlipCount(message, readValue), 0) * (readValue ? -1 : 1);
		if (readValue !== null) {
			updateMessages((current) => current.map((message) =>
				selectedIds.includes(message.id)
					? { ...message, read: readValue, ...(message.threadMessageIds ? { threadUnread: readValue ? 0 : message.threadMessageIds.length } : {}) }
					: message,
			));
			setSelectedMessages((current) => current.map((message) => ({ ...message, read: readValue })));
			if (inboxUnreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta });
		}
		try {
			await runBulkMessageAction(expandSelectedIds(selectedIds), action, true, folderId);
			setBulkStatus(t("common.done"));
			setSelectedMessages([]);
		} catch (error) {
			if (readValue !== null) {
				updateMessages(previousMessages);
				if (inboxUnreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta: -inboxUnreadDelta });
			}
			throw error;
		} finally {
			setPendingBulkAction(false);
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			{confirmationDialog}
			<div className={`relative flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-neutral-200 py-2 ${compact ? "px-4" : "px-4.5 md:px-6"}`}>
			<BulkActionFeedback message={actionError ?? bulkStatus} pending={pendingBulkAction} error={Boolean(actionError)} dismissLabel={t("navigation.close")} onDismiss={() => { setBulkStatus(null); setActionError(null); }} />
				{selectedMessageId ? <h2 className="sr-only">{title}</h2> : <h1 className="sr-only">{title}</h1>}
				<div className="flex min-w-0 flex-[1_1_10rem] items-center gap-3">
					<Tooltip label={t("list.selectAll")}>
						<Checkbox
							checked={allVisibleSelected}
							disabled={messages.length === 0 || pendingBulkAction}
							onChange={(event) => toggleAllVisible(event.target.checked)}
							className="h-4 w-4 rounded border-neutral-300"
							aria-label={t("list.selectAll")}
						/>
					</Tooltip>
					<Tooltip label={t("list.refresh")}>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							aria-label={t("list.refresh")}
							aria-busy={isRefreshing}
							disabled={mailboxesLoading || isLoading || isRefreshing || pendingBulkAction || emptyingFolder}
							className="h-8 w-8 shrink-0 p-0 text-neutral-600"
							onClick={async () => {
								setActionError(null);
								try { await refresh(); }
								catch { setActionError(t("list.refreshFailed")); }
							}}
						>
							<RefreshCw aria-hidden="true" className={`h-4 w-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />
						</Button>
					</Tooltip>
					<span role="status" className="sr-only">{isRefreshing ? t("list.refreshing") : ""}</span>
					{selectedIds.length > 0 && !compact ? (
						<BulkMessageToolbar
							selectedCount={selectedIds.length}
							hasUnreadSelection={hasUnreadSelection}
							onAction={runSelectedActionReportingErrors}
							onApplyLabel={(labelId) => void applyLabelToSelection(labelId)}
							onClearSelection={() => setSelectedMessages([])}
							pending={pendingBulkAction}
							folder={config.folderId ? undefined : config.folder}
						/>
					) : (
						(compact || isMobile) && (
							<p aria-hidden="true" className="min-w-0 truncate pl-1 font-semibold text-neutral-900">{title}</p>
						)
					)}
				</div>
				{(selectedIds.length === 0 || compact) && (
					<div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 text-neutral-500">
						<span className="text-xs text-neutral-500 whitespace-nowrap">
							{t("list.range", { start: pageRange.start, end: pageRange.end, total: pageRange.total })}
						</span>
						<Tooltip label={t("list.previousPage")}>
							<Button
								variant="ghost"
								size="sm"
								disabled={offset === 0 || isLoading}
								onClick={() => setOffset(Math.max(offset - limit, 0))}
								aria-label={t("list.previousPage")}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</Tooltip>
						<Tooltip label={t("list.nextPage")}>
							<Button
								variant="ghost"
								size="sm"
								disabled={offset + messages.length >= total || isLoading}
								onClick={() => setOffset(offset + limit)}
								aria-label={t("list.nextPage")}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</Tooltip>
						{config.folder === "inbox" && (
							<Tooltip label={unreadOnly ? t("list.showingUnread") : t("list.showUnreadOnly")}>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									aria-label={t("list.showUnreadOnly")}
									aria-pressed={unreadOnly}
									onClick={() => setUnreadOnly((current) => !current)}
									className={unreadOnly ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : undefined}
								>
									<ListFilter className="h-4 w-4" />
								</Button>
							</Tooltip>
						)}
						{permanentDeleteFolder && (
							<Tooltip label={getEmptyFolderLabel(permanentDeleteFolder, t)}>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									aria-label={getEmptyFolderLabel(permanentDeleteFolder, t)}
									disabled={emptyingFolder || isLoading || total === 0}
									onClick={() => void emptyFolder()}
									className="gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
									{!compact && <span className="max-md:hidden">{emptyingFolder ? t("list.emptying") : getEmptyFolderLabel(permanentDeleteFolder, t)}</span>}
								</Button>
							</Tooltip>
						)}
						{!compact && headerIcons.map((Icon, index) => (
							<Icon key={index} className="h-4 w-4" />
						))}
					</div>
				)}
			</div>


			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-gutter-stable">
				{config.folder === "inbox" && !config.folderId && offset === 0 && !mailboxesLoading && <DueFollowUps mailboxId={selectedMailbox?.id} />}
				<div role="list" aria-label={title} className="divide-y divide-neutral-100">
					{messages.map((message) => (
						<MessageListRow
							labelsById={labelsById}
							key={message.id}
							message={message}
							config={config}
							selected={selectedIds.includes(message.id)}
							active={message.id === selectedMessageId}
							compact={compact || isMobile}
							currentAccountName={currentAccountName}
							onSelectedChange={(...args) => { if (!bulkActionLock.current) updateSelectedMessage(...args); }}
							onMessageAction={(messageId, action) => {
								setActionError(null);
								return runBulkMessageAction(expandSelectedIds([messageId]), action, action !== "read" && action !== "unread").catch((error) => {
									setActionError(error instanceof PartialDeleteError ? t("actions.error.deleteSkipped") : t("actions.error.update"));
									throw error;
								});
							}}
							dragMessageIds={expandSelectedIds(selectedIds.includes(message.id) ? selectedIds : [message.id])}
						/>
					))}
				</div>
				{!isLoading && messages.length === 0 && (
					<p className="px-6 py-4 text-sm text-neutral-500">
						{hasActiveFilters ? t("list.noMatch") : config.emptyTextKey ? t(config.emptyTextKey) : config.emptyText}
					</p>
				)}
			</div>
		</div>
	);
}
