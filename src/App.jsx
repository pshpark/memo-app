import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const THEME_STORAGE_KEY = "memo-space-theme";

const GlobalScrollbarStyle = () => (
  <style>{`
    :root {
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
    }

    * {
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
    }

    *::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    *::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
      border-radius: 999px;
    }

    *::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb);
      border-radius: 999px;
      border: 1.5px solid var(--scrollbar-track);
    }

    *::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover);
    }

    *::-webkit-scrollbar-corner {
      background: transparent;
    }

    textarea::-webkit-scrollbar,
    input::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
  `}</style>
);

const IconBase = ({ children, className = "", filled = false }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke={filled ? "none" : "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

const NoteIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M6 3.5h8.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z" />
    <path d="M14 3.5V8h4.5" />
  </IconBase>
);

const SearchIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </IconBase>
);

const PlusIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </IconBase>
);

const CloseIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </IconBase>
);

const CheckIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="m5 13 4 4L19 7" />
  </IconBase>
);

const TagIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M20.5 13.2 13.2 20.5a2 2 0 0 1-2.8 0L3.5 13.6V4h9.6l7.4 7.4a1.9 1.9 0 0 1 0 1.8Z" />
    <circle cx="8" cy="8" r="1.4" />
  </IconBase>
);

const MoonIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M21 14.4A8 8 0 0 1 9.6 3 7 7 0 1 0 21 14.4Z" />
  </IconBase>
);

const SunIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.9 4.9 1.4 1.4" />
    <path d="m17.7 17.7 1.4 1.4" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.9 19.1 1.4-1.4" />
    <path d="m17.7 6.3 1.4-1.4" />
  </IconBase>
);

const MenuIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M5 7h14" />
    <path d="M5 12h14" />
    <path d="M5 17h14" />
  </IconBase>
);

const TrashIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 14h10l1-14" />
    <path d="M9 7V4h6v3" />
  </IconBase>
);

const PinIcon = ({ className = "", filled = false }) => (
  <IconBase className={className} filled={filled}>
    {filled ? (
      <path d="M14.9 2.6a1 1 0 0 0-1.4 0l-.8.8a1 1 0 0 0-.1 1.3l.3.4-4.1 4.1-1-.3a1.5 1.5 0 0 0-1.5.4l-.5.5a1 1 0 0 0 0 1.4l3 3-4.1 4.1a1 1 0 1 0 1.4 1.4l4.1-4.1 3 3a1 1 0 0 0 1.4 0l.5-.5a1.5 1.5 0 0 0 .4-1.5l-.3-1 4.1-4.1.4.3a1 1 0 0 0 1.3-.1l.8-.8a1 1 0 0 0 0-1.4l-6.9-6.8Z" />
    ) : (
      <>
        <path d="M14.5 4.5 19.5 9.5" />
        <path d="m12.5 6.5-4 4-1.4-.4a1 1 0 0 0-1 .25l-.6.6 7.55 7.55.6-.6a1 1 0 0 0 .25-1l-.4-1.4 4-4" />
        <path d="m9.5 14.5-4 4" />
        <path d="m13 3 8 8" />
      </>
    )}
  </IconBase>
);

const LogoutIcon = ({ className = "" }) => (
  <IconBase className={className}>
    <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9" />
  </IconBase>
);

const MoreIcon = ({ className = "" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const normalizeMemoFromDb = (memo) => ({
  id: memo.id,
  title: memo.title || "제목 없음",
  content: memo.content || "",
  tags: Array.isArray(memo.tags) ? memo.tags : [],
  isPinned: Boolean(memo.is_pinned),
  createdAt: memo.created_at,
  updatedAt: memo.updated_at || memo.created_at,
});

const sortMemos = (items) => {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

const parseTags = (value) => {
  const seen = new Set();

  return value
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const mergeTags = (...tagGroups) => {
  const seen = new Set();
  const merged = [];

  tagGroups.flat().forEach((tag) => {
    const normalizedTag = tag.trim().replace(/^#+/, "");

    if (!normalizedTag) {
      return;
    }

    const key = normalizedTag.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push(normalizedTag);
  });

  return merged;
};

const parseMemoContentLines = (value) => {
  return value.split("\n").map((rawLine, index) => {
    const trimmedLine = rawLine.trimStart();

    const checkboxMatch = trimmedLine.match(/^- \[( |x|X)\]\s?(.*)$/);

    if (checkboxMatch) {
      return {
        id: `${index}-${rawLine}`,
        type: "checkbox",
        checked: checkboxMatch[1].toLowerCase() === "x",
        text: checkboxMatch[2] || "체크 항목",
      };
    }

    const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/);

    if (bulletMatch) {
      return {
        id: `${index}-${rawLine}`,
        type: "bullet",
        text: bulletMatch[1],
      };
    }

    if (!rawLine.trim()) {
      return {
        id: `${index}-${rawLine}`,
        type: "empty",
        text: "",
      };
    }

    return {
      id: `${index}-${rawLine}`,
      type: "text",
      text: rawLine,
    };
  });
};

const MemoContentPreview = ({ content, maxLines = 4 }) => {
  const parsedLines = parseMemoContentLines(content || "내용 없음")
    .filter((line) => line.type !== "empty")
    .slice(0, maxLines);

  return (
    <div className="mt-3 space-y-1.5 overflow-hidden text-sm font-semibold leading-6 text-[var(--text-muted)]">
      {parsedLines.map((line) => {
        if (line.type === "checkbox") {
          return (
            <div key={line.id} className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-[5px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border ${
                  line.checked
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-transparent text-transparent"
                }`}
              >
                <CheckIcon className="h-3 w-3" />
              </span>

              <span
                className={`min-w-0 truncate ${
                  line.checked ? "text-[var(--text-soft)] line-through" : ""
                }`}
              >
                {line.text}
              </span>
            </div>
          );
        }

        if (line.type === "bullet") {
          return (
            <div key={line.id} className="flex min-w-0 items-start gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="min-w-0 truncate">{line.text}</span>
            </div>
          );
        }

        return (
          <p key={line.id} className="whitespace-pre-wrap">
            {line.text}
          </p>
        );
      })}
    </div>
  );
};

const MemoContentDetail = ({ content }) => {
  const parsedLines = parseMemoContentLines(content || "내용 없음");

  return (
    <div className="text-base font-semibold leading-8 text-[var(--text-main)] md:text-lg">
      {parsedLines.map((line) => {
        if (line.type === "empty") {
          return <div key={line.id} className="h-3" />;
        }

        if (line.type === "checkbox") {
          return (
            <div key={line.id} className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-[7px] grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border ${
                  line.checked
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-transparent text-transparent"
                }`}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>

              <span
                className={`min-w-0 break-words ${
                  line.checked ? "text-[var(--text-soft)] line-through" : ""
                }`}
              >
                {line.text}
              </span>
            </div>
          );
        }

        if (line.type === "bullet") {
          return (
            <div key={line.id} className="flex min-w-0 items-start gap-3">
              <span className="mt-[13px] h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="min-w-0 break-words">{line.text}</span>
            </div>
          );
        }

        return (
          <p key={line.id} className="whitespace-pre-wrap break-words">
            {line.text}
          </p>
        );
      })}
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [authMode, setAuthMode] = useState("signIn");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [dataError, setDataError] = useState("");

  const [memos, setMemos] = useState([]);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarRendered, setIsSidebarRendered] = useState(false);

  const [isMemoEditorOpen, setIsMemoEditorOpen] = useState(false);
  const [memoPanelMode, setMemoPanelMode] = useState("edit");
  const [activeMemo, setActiveMemo] = useState(null);
  const [isMemoActionsOpen, setIsMemoActionsOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [draftTags, setDraftTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [draftIsPinned, setDraftIsPinned] = useState(false);
  const contentInputRef = useRef(null);

  const isDark = theme === "dark";

  const themeVars = useMemo(
    () =>
      isDark
        ? {
            "--app-bg": "#0D1822",
            "--sidebar-bg": "#13212D",
            "--panel-bg": "#101B25",
            "--card-bg": "#152431",
            "--modal-bg": "#152431",
            "--input-bg": "#1B2D3C",
            "--text-main": "#EAF2FA",
            "--text-muted": "#9FB0C0",
            "--text-soft": "#6F8191",
            "--line": "#294050",
            "--accent": "#63B3ED",
            "--accent-strong": "#46A3E8",
            "--accent-deep": "#0F65A8",
            "--accent-soft": "#173D5C",
            "--accent-soft-text": "#8DD0FF",
            "--overlay": "rgba(2, 8, 15, 0.58)",
            "--shadow": "rgba(0, 0, 0, 0.26)",
            "--scrollbar-track": "rgba(234, 242, 250, 0.06)",
            "--scrollbar-thumb": "rgba(99, 179, 237, 0.38)",
            "--scrollbar-thumb-hover": "rgba(99, 179, 237, 0.64)",
          }
        : {
            "--app-bg": "#F4F8FC",
            "--sidebar-bg": "#EAF1F7",
            "--panel-bg": "#F4F8FC",
            "--card-bg": "#FFFFFF",
            "--modal-bg": "#FFFFFF",
            "--input-bg": "#EEF5FB",
            "--text-main": "#17202A",
            "--text-muted": "#65768A",
            "--text-soft": "#A2AFBC",
            "--line": "#D5E0EA",
            "--accent": "#1B66A9",
            "--accent-strong": "#155890",
            "--accent-deep": "#0E4F86",
            "--accent-soft": "#DDF0FF",
            "--accent-soft-text": "#1474B8",
            "--overlay": "rgba(17, 24, 39, 0.24)",
            "--shadow": "rgba(22, 35, 50, 0.14)",
            "--scrollbar-track": "rgba(14, 79, 134, 0.06)",
            "--scrollbar-thumb": "rgba(27, 102, 169, 0.30)",
            "--scrollbar-thumb-hover": "rgba(27, 102, 169, 0.52)",
          },
    [isDark]
  );

  const openSidebar = () => {
    setIsSidebarRendered(true);

    window.requestAnimationFrame(() => {
      setIsSidebarOpen(true);
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (isSidebarOpen || !isSidebarRendered) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSidebarRendered(false);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isSidebarOpen, isSidebarRendered]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const themeColor = isDark ? "#0D1822" : "#F4F8FC";
    let metaTheme = document.querySelector("meta[name='theme-color']");

    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.setAttribute("name", "theme-color");
      document.head.appendChild(metaTheme);
    }

    metaTheme.setAttribute("content", themeColor);
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;

    Object.entries(themeVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
      document.body.style.setProperty(key, value);
    });
  }, [theme, isDark, themeVars]);

  useEffect(() => {
    const shouldLockScroll = isMemoEditorOpen || isSidebarRendered;
    document.body.style.overflow = shouldLockScroll ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMemoEditorOpen, isSidebarRendered]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsBooting(false);
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadMemos = useCallback(
    async (targetUser = user) => {
      if (!targetUser) {
        return;
      }

      setIsDataLoading(true);
      setDataError("");

      try {
        const { data, error } = await supabase
          .from("memos")
          .select("*")
          .eq("user_id", targetUser.id)
          .order("is_pinned", { ascending: false })
          .order("updated_at", { ascending: false });

        if (error) {
          throw error;
        }

        setMemos(sortMemos((data || []).map(normalizeMemoFromDb)));
      } catch (error) {
        console.error(error);
        setDataError(error.message || "데이터를 불러오지 못했어요.");
      } finally {
        setIsDataLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setMemos([]);
      setSearch("");
      setActiveTag("all");
      return;
    }

    loadMemos(user);
  }, [user, loadMemos]);

  const tagStats = useMemo(() => {
    const countMap = new Map();

    memos.forEach((memo) => {
      memo.tags.forEach((tag) => {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  }, [memos]);

  const filteredMemos = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sortMemos(
      memos.filter((memo) => {
        const matchesSearch =
          !keyword ||
          memo.title.toLowerCase().includes(keyword) ||
          memo.content.toLowerCase().includes(keyword) ||
          memo.tags.some((tag) => tag.toLowerCase().includes(keyword));

        const matchesTag = activeTag === "all" || memo.tags.includes(activeTag);

        return matchesSearch && matchesTag;
      })
    );
  }, [memos, search, activeTag]);

  useEffect(() => {
    if (activeTag !== "all" && !tagStats.some((tag) => tag.name === activeTag)) {
      setActiveTag("all");
    }
  }, [activeTag, tagStats]);

  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setDraftTags([]);
    setTagDraft("");
    setDraftIsPinned(false);
  };

  const closeMemoEditor = () => {
    setIsMemoEditorOpen(false);
    setMemoPanelMode("edit");
    setActiveMemo(null);
    setIsMemoActionsOpen(false);
    resetEditor();
  };

  useEffect(() => {
    if (!isMemoEditorOpen) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMemoEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMemoEditorOpen]);

  const openCreateEditor = () => {
    resetEditor();
    setActiveMemo(null);
    setMemoPanelMode("edit");
    setIsMemoActionsOpen(false);
    setIsMemoEditorOpen(true);
    closeSidebar();
  };

  const openMemoViewer = (memo) => {
    setEditingId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    setDraftTags(memo.tags);
    setTagDraft("");
    setDraftIsPinned(memo.isPinned);
    setActiveMemo(memo);
    setMemoPanelMode("view");
    setIsMemoActionsOpen(false);
    setIsMemoEditorOpen(true);
  };

  const startEditingActiveMemo = () => {
    const latestMemo = memos.find((memo) => memo.id === editingId) || activeMemo;

    if (!latestMemo) {
      return;
    }

    setTitle(latestMemo.title);
    setContent(latestMemo.content);
    setDraftTags(latestMemo.tags);
    setTagDraft("");
    setDraftIsPinned(latestMemo.isPinned);
    setActiveMemo(latestMemo);
    setMemoPanelMode("edit");
    setIsMemoActionsOpen(false);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    const email = authEmail.trim();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage("");

    try {
      if (authMode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setAuthEmail("");
        setAuthPassword("");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setAuthMode("signIn");
          setAuthMessage(
            "가입 요청이 완료됐어요. 이메일 인증이 켜져 있다면 메일 확인 후 로그인해 주세요."
          );
        } else {
          setAuthEmail("");
          setAuthPassword("");
        }
      }
    } catch (error) {
      setAuthMessage(error.message || "인증 처리 중 문제가 발생했어요.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setUser(null);
    setMemos([]);
    setSearch("");
    setActiveTag("all");
    closeSidebar();
    closeMemoEditor();
  };

  const addTagsFromValue = (value) => {
    const nextTags = parseTags(value);

    if (nextTags.length === 0) {
      return;
    }

    setDraftTags((prev) => mergeTags(prev, nextTags));
    setTagDraft("");
  };

  const handleTagDraftChange = (event) => {
    const value = event.target.value;

    if (value.includes(",")) {
      addTagsFromValue(value);
      return;
    }

    setTagDraft(value.replace(/^#+/, ""));
  };

  const handleTagDraftKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTagsFromValue(tagDraft);
    }

    if (event.key === "Backspace" && !tagDraft && draftTags.length > 0) {
      setDraftTags((prev) => prev.slice(0, -1));
    }
  };

  const removeDraftTag = (targetTag) => {
    setDraftTags((prev) => prev.filter((tag) => tag !== targetTag));
  };

  const insertContentSnippet = (snippet) => {
    const textarea = contentInputRef.current;

    if (!textarea) {
      setContent((prev) => {
        const needsLineBreak = prev && !prev.endsWith("\n");
        return `${prev}${needsLineBreak ? "\n" : ""}${snippet}`;
      });

      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const needsLineBreakBefore = before && !before.endsWith("\n");
    const insertion = `${needsLineBreakBefore ? "\n" : ""}${snippet}`;
    const nextContent = `${before}${insertion}${after}`;
    const nextCursorPosition = before.length + insertion.length;

    setContent(nextContent);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const handleSubmitMemo = async (event) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!title.trim() && !content.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const finalTags = mergeTags(draftTags, parseTags(tagDraft));

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("memos")
          .update({
            title: title.trim() || "제목 없음",
            content: content.trim(),
            tags: finalTags,
            is_pinned: draftIsPinned,
            updated_at: now,
          })
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const updatedMemo = normalizeMemoFromDb(data);

        setMemos((prev) =>
          sortMemos(
            prev.map((memo) =>
              memo.id === updatedMemo.id ? updatedMemo : memo
            )
          )
        );
      } else {
        const { data, error } = await supabase
          .from("memos")
          .insert({
            user_id: user.id,
            title: title.trim() || "제목 없음",
            content: content.trim(),
            tags: finalTags,
            is_pinned: draftIsPinned,
            updated_at: now,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const newMemo = normalizeMemoFromDb(data);
        setMemos((prev) => sortMemos([newMemo, ...prev]));
      }

      closeMemoEditor();
    } catch (error) {
      console.error(error);
      alert(error.message || "메모를 저장하지 못했어요.");
    }
  };

  const handleDeleteMemo = async () => {
    if (!user || !editingId) {
      return;
    }

    const confirmed = window.confirm("이 메모를 삭제할까요?");

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("memos")
        .delete()
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMemos((prev) => prev.filter((memo) => memo.id !== editingId));
      closeMemoEditor();
    } catch (error) {
      console.error(error);
      alert(error.message || "메모를 삭제하지 못했어요.");
    }
  };

  const handleTogglePin = async (memo, event) => {
    event?.stopPropagation?.();

    if (!user || !memo) {
      return;
    }

    const nextIsPinned = !memo.isPinned;

    setMemos((prev) =>
      sortMemos(
        prev.map((item) =>
          item.id === memo.id ? { ...item, isPinned: nextIsPinned } : item
        )
      )
    );

    setActiveMemo((prev) =>
      prev?.id === memo.id ? { ...prev, isPinned: nextIsPinned } : prev
    );

    if (editingId === memo.id) {
      setDraftIsPinned(nextIsPinned);
    }

    try {
      const { data, error } = await supabase
        .from("memos")
        .update({
          is_pinned: nextIsPinned,
        })
        .eq("id", memo.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updatedMemo = normalizeMemoFromDb(data);

      setMemos((prev) =>
        sortMemos(
          prev.map((item) =>
            item.id === updatedMemo.id ? updatedMemo : item
          )
        )
      );

      setActiveMemo((prev) =>
        prev?.id === updatedMemo.id ? updatedMemo : prev
      );

      if (editingId === updatedMemo.id) {
        setDraftIsPinned(updatedMemo.isPinned);
      }
    } catch (error) {
      console.error(error);

      setMemos((prev) =>
        sortMemos(
          prev.map((item) =>
            item.id === memo.id ? { ...item, isPinned: memo.isPinned } : item
          )
        )
      );

      setActiveMemo((prev) =>
        prev?.id === memo.id ? { ...prev, isPinned: memo.isPinned } : prev
      );

      if (editingId === memo.id) {
        setDraftIsPinned(memo.isPinned);
      }

      alert(error.message || "고정 상태를 변경하지 못했어요.");
    }
  };

  const handleTagClick = (tag) => {
    setActiveTag(tag);
    closeSidebar();
  };

  const resetFilters = () => {
    setSearch("");
    setActiveTag("all");
  };

  const formatRelativeTime = (dateString) => {
    const targetTime = new Date(dateString).getTime();
    const nowTime = Date.now();
    const diffMinutes = Math.max(1, Math.floor((nowTime - targetTime) / 60000));

    if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours}시간 전`;
    }

    const diffDays = Math.floor(diffHours / 24);

    if (diffDays < 7) {
      return `${diffDays}일 전`;
    }

    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 py-5">
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-3 text-left"
        >
          {/* <NoteIcon className="h-5 w-5 text-[var(--accent)]" /> */}
          <span className="text-base font-bold tracking-[-0.04em] text-[var(--text-main)]">
            LOVE & PEACE
          </span>
        </button>

        <button
          type="button"
          onClick={closeSidebar}
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] md:hidden"
          aria-label="메뉴 닫기"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={openCreateEditor}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--accent)] text-sm font-bold text-white transition hover:bg-[var(--accent-strong)]"
        >
          <PlusIcon className="h-4 w-4" />
          새 메모
        </button>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-5">
        <p className="px-1 text-xs font-bold text-[var(--text-soft)]">전체</p>

        <button
          type="button"
          onClick={() => {
            resetFilters();
            closeSidebar();
          }}
          className={`mt-2 flex h-10 w-full items-center justify-between rounded-[10px] px-3 text-left text-sm font-bold transition ${
            activeTag === "all"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-main)] hover:bg-[var(--input-bg)]"
          }`}
        >
          <span>모든 메모</span>
          <span
            className={`grid min-w-6 place-items-center rounded-full px-2 text-xs ${
              activeTag === "all"
                ? "bg-white/20 text-white"
                : "bg-[var(--input-bg)] text-[var(--text-muted)]"
            }`}
          >
            {memos.length}
          </span>
        </button>

        <div className="mt-6">
          <p className="mb-3 flex items-center gap-2 px-1 text-xs font-bold text-[var(--text-soft)]">
            <TagIcon className="h-4 w-4" />
            태그
          </p>

          {tagStats.length === 0 ? (
            <p className="px-1 py-3 text-sm font-semibold leading-6 text-[var(--text-muted)]">
              아직 태그가 없어요.
              <br />
              메모 저장 시 태그를 추가해보세요.
            </p>
          ) : (
            <div className="space-y-1">
              {tagStats.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => handleTagClick(tag.name)}
                  className={`flex h-10 w-full items-center justify-between rounded-[10px] px-3 text-left text-sm font-bold transition ${
                    activeTag === tag.name
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-main)] hover:bg-[var(--input-bg)]"
                  }`}
                >
                  <span>#{tag.name}</span>
                  <span
                    className={`grid min-w-6 place-items-center rounded-full px-2 text-xs ${
                      activeTag === tag.name
                        ? "bg-white/20 text-white"
                        : "bg-[var(--input-bg)] text-[var(--text-muted)]"
                    }`}
                  >
                    {tag.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <button
          type="button"
          onClick={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
          className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--input-bg)]"
        >
          {isDark ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
          {isDark ? "라이트 모드" : "다크 모드"}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-xs font-bold text-[var(--text-soft)] transition hover:bg-[var(--input-bg)]"
        >
          <LogoutIcon className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </>
  );

  if (isBooting) {
    return (
      <main
        style={themeVars}
        className="grid min-h-dvh place-items-center bg-[var(--app-bg)] px-5 text-[var(--text-main)]"
      >
        <GlobalScrollbarStyle />
        <section className="rounded-[24px] border border-[var(--line)] bg-[var(--card-bg)] p-8 text-center shadow-[0_20px_60px_var(--shadow)]">
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">
            LOADING
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.06em]">
            Memo
          </h1>
        </section>
      </main>
    );
  }

  if (!session || !user) {
    return (
      <main
        style={themeVars}
        className="grid min-h-dvh place-items-center bg-[var(--app-bg)] px-5 py-8 text-[var(--text-main)]"
      >
        <GlobalScrollbarStyle />
        <section className="w-full max-w-[440px] rounded-[26px] border border-[var(--line)] bg-[var(--card-bg)] p-6 shadow-[0_24px_70px_var(--shadow)] sm:p-8">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-[var(--accent)]">
            PRIVATE MEMO APP
          </p>

          <h1 className="text-4xl font-bold leading-[0.95] tracking-[-0.075em]">
            LOVE & PEACE
          </h1>

          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--text-muted)]">
            Supabase 계정으로 로그인하면 PC와 모바일에서 같은 메모를 볼 수
            있어요.
          </p>

          <form onSubmit={handleAuthSubmit} className="mt-8">
            <label className="block text-sm font-extrabold">
              이메일
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-3 h-[54px] w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-4 text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
              />
            </label>

            <label className="mt-5 block text-sm font-extrabold">
              비밀번호
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="6자 이상"
                className="mt-3 h-[54px] w-full rounded-xl border border-[var(--line)] bg-[var(--input-bg)] px-4 text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
              />
            </label>

            {authMessage && (
              <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] p-4 text-sm font-semibold leading-6 text-[var(--accent-soft-text)]">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="mt-6 h-14 w-full rounded-full bg-[var(--accent)] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading
                ? "처리 중..."
                : authMode === "signIn"
                  ? "로그인"
                  : "회원가입"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setAuthMode((prev) =>
                prev === "signIn" ? "signUp" : "signIn"
              );
              setAuthMessage("");
            }}
            className="mt-4 w-full rounded-full border border-[var(--line)] bg-transparent px-4 py-3 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--input-bg)]"
          >
            {authMode === "signIn"
              ? "처음이라면 회원가입하기"
              : "이미 계정이 있다면 로그인하기"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      style={themeVars}
      className="min-h-dvh bg-[var(--app-bg)] text-[var(--text-main)]"
    >
      <GlobalScrollbarStyle />

      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-[260px] flex-col border-r border-[var(--line)] bg-[var(--sidebar-bg)] md:flex">
        {sidebarContent}
      </aside>

      {isSidebarRendered && (
        <div
          className={`fixed inset-0 z-40 md:hidden ${
            isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={closeSidebar}
            className={`absolute inset-0 bg-[var(--overlay)] backdrop-blur-[4px] transition-opacity duration-300 ease-out ${
              isSidebarOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label="사이드바 닫기"
          />

          <aside
            className={`relative flex h-dvh w-[70vw] min-w-[300px] max-w-[520px] flex-col border-r border-[var(--line)] bg-[var(--sidebar-bg)] shadow-[20px_0_60px_var(--shadow)] transition-transform duration-300 ease-out will-change-transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <section className="min-h-dvh md:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--app-bg)]/90 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openSidebar}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] md:hidden"
              aria-label="메뉴 열기"
            >
              <MenuIcon className="h-7 w-7" />
            </button>

            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />

              <input
                type="search"
                placeholder="메모 검색..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-[15px] border border-[var(--line)] bg-[var(--input-bg)] pl-11 pr-4 text-base font-semibold text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] md:h-10 md:text-sm"
              />
            </div>

            <button
              type="button"
              onClick={openCreateEditor}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-white transition hover:bg-[var(--accent-strong)] md:hidden"
              aria-label="새 메모"
            >
              <PlusIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] md:grid"
              aria-label="테마 변경"
            >
              {isDark ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {activeTag !== "all" && (
              <button
                type="button"
                onClick={() => setActiveTag("all")}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-bold text-[var(--accent-soft-text)]"
              >
                #{activeTag}
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}

            <span className="text-sm font-bold text-[var(--text-muted)]">
              {filteredMemos.length}개 메모
            </span>

            {(activeTag !== "all" || search) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-sm font-bold text-[var(--text-soft)] underline-offset-4 hover:underline"
              >
                필터 초기화
              </button>
            )}
          </div>
        </header>

        {dataError && (
          <section className="mx-4 mt-5 rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-4 text-sm font-semibold text-[var(--accent-soft-text)] md:mx-6">
            {dataError}
            <button
              type="button"
              onClick={() => loadMemos(user)}
              className="ml-3 font-bold underline"
            >
              다시 시도
            </button>
          </section>
        )}

        <section className="px-4 py-6 md:px-6">
          {isDataLoading && memos.length === 0 ? (
            <div className="grid min-h-[320px] max-w-[1040px] place-items-center rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)]">
              <p className="text-sm font-bold tracking-[0.2em] text-[var(--accent)]">
                SYNCING
              </p>
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="grid min-h-[420px] max-w-[1040px] place-items-center rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--card-bg)] p-8 text-center">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">
                  EMPTY
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.06em]">
                  표시할 메모가 없어요
                </h2>
                <p className="mt-3 text-sm font-semibold text-[var(--text-muted)]">
                  새 메모를 작성하거나 검색어와 태그 필터를 변경해보세요.
                </p>
                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="mt-6 h-12 rounded-full bg-[var(--accent)] px-6 font-bold text-white transition hover:bg-[var(--accent-strong)]"
                >
                  새 메모 작성
                </button>
              </div>
            </div>
          ) : (
            <div className="grid max-w-[1040px] gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMemos.map((memo) => (
                <article
                  key={memo.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemoViewer(memo)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openMemoViewer(memo);
                    }
                  }}
                  className={`group flex min-h-[168px] cursor-pointer flex-col rounded-[18px] border bg-[var(--card-bg)] p-4 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_var(--shadow)] focus:border-[var(--accent)] sm:min-h-[170px] sm:rounded-[14px] ${
                    memo.isPinned
                      ? "border-[var(--accent)]"
                      : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate text-lg font-bold tracking-[-0.04em] text-[var(--text-main)] sm:text-xl">
                      {memo.title}
                    </h2>

                    <button
                      type="button"
                      onClick={(event) => handleTogglePin(memo, event)}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
                        memo.isPinned
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      }`}
                      aria-label={memo.isPinned ? "고정 해제" : "상단 고정"}
                      title={memo.isPinned ? "고정 해제" : "상단 고정"}
                    >
                      <PinIcon className="h-4 w-4" filled={memo.isPinned} />
                    </button>
                  </div>

                  <MemoContentPreview content={memo.content} maxLines={4} />

                  <div className="mt-auto flex items-end gap-2 pt-4">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {memo.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTagClick(tag);
                          }}
                          className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-soft-text)] transition hover:bg-[var(--accent)] hover:text-white"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>

                    <span className="shrink-0 pb-1 text-xs font-bold text-[var(--text-soft)]">
                      {formatRelativeTime(memo.updatedAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {isMemoEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] px-4 pt-24 backdrop-blur-[2px] max-md:block max-md:bg-transparent max-md:p-0 max-md:backdrop-blur-0 md:items-center md:pt-0">
          <button
            type="button"
            onClick={closeMemoEditor}
            className="absolute inset-0 max-md:hidden"
            aria-label="메모 패널 닫기"
          />

          {memoPanelMode === "view" && activeMemo ? (
            <section className="relative flex h-[80dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--modal-bg)] shadow-[0_30px_90px_var(--shadow)] max-md:fixed max-md:inset-0 max-md:h-dvh max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:shadow-none md:h-[80dvh] md:rounded-[14px]">
              <div className="relative flex items-center gap-3 border-b border-[var(--line)] px-5 max-md:h-[72px] md:py-4">
                <button
                  type="button"
                  onClick={closeMemoEditor}
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] max-md:grid"
                  aria-label="뒤로"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>

                <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-[-0.02em] text-[var(--text-main)] md:text-lg">
                  {activeMemo.title}
                </h1>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMemoActionsOpen((prev) => !prev)}
                    className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)]"
                    aria-label="메모 메뉴 열기"
                    title="메모 메뉴"
                  >
                    <MoreIcon className="h-5 w-5" />
                  </button>

                  {isMemoActionsOpen && (
                    <div className="absolute right-0 top-12 z-10 w-36 overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] p-1 shadow-[0_16px_40px_var(--shadow)]">
                      <button
                        type="button"
                        onClick={startEditingActiveMemo}
                        className="flex h-10 w-full items-center rounded-[10px] px-3 text-left text-sm font-bold text-[var(--text-main)] transition hover:bg-[var(--input-bg)]"
                      >
                        수정하기
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMemoActionsOpen(false);
                          handleDeleteMemo();
                        }}
                        className="flex h-10 w-full items-center rounded-[10px] px-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-500/10"
                      >
                        삭제하기
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeMemoEditor}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] max-md:hidden"
                  aria-label="닫기"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto px-5 py-5"
                onClick={() => setIsMemoActionsOpen(false)}
              >
                <MemoContentDetail content={activeMemo.content} />
              </div>

              <div className="border-t border-[var(--line)] px-5 py-4 max-md:pb-[calc(16px+env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />

                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {activeMemo.tags.length > 0 ? (
                      activeMemo.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagClick(tag)}
                          className="inline-flex items-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-bold text-[var(--accent-soft-text)]"
                        >
                          #{tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-soft)]">
                        태그 없음
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-xs font-bold text-[var(--text-soft)]">
                    {formatRelativeTime(activeMemo.updatedAt)}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSubmitMemo}
              className="relative flex h-[80dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--modal-bg)] shadow-[0_30px_90px_var(--shadow)] max-md:fixed max-md:inset-0 max-md:h-dvh max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:shadow-none md:h-[80dvh] md:rounded-[14px]"
            >
              <div className="flex items-center gap-2 border-b border-transparent px-5 pt-5 max-md:h-[72px] max-md:border-[var(--line)] max-md:pt-0">
                <button
                  type="button"
                  onClick={closeMemoEditor}
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] max-md:grid"
                  aria-label="뒤로"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="제목"
                  className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-[-0.04em] text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)] md:text-lg"
                />

                <button
                  type="submit"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 text-sm font-bold text-white transition hover:bg-[var(--accent-strong)] md:h-10 md:px-4"
                >
                  <CheckIcon className="h-4 w-4" />
                  저장
                </button>

                <button
                  type="button"
                  onClick={closeMemoEditor}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--input-bg)] max-md:hidden"
                  aria-label="닫기"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <textarea
                ref={contentInputRef}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="메모 내용을 입력하세요..."
                className="mt-5 flex-1 resize-none bg-transparent px-5 text-base font-semibold leading-8 text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)] max-md:mt-0 max-md:px-5 max-md:py-5 md:text-lg"
              />

              <div className="border-t border-[var(--line)] px-5 py-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))]">
                <div className="mb-2 flex gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => insertContentSnippet("- ")}
                    className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    • 불릿
                  </button>

                  <button
                    type="button"
                    onClick={() => insertContentSnippet("- [ ] ")}
                    className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    ☐ 체크박스
                  </button>

                  <button
                    type="button"
                    onClick={() => insertContentSnippet("- [x] ")}
                    className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    ☑ 완료
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />

                  <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                    {draftTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeDraftTag(tag)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-soft-text)]"
                      >
                        #{tag}
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    ))}

                    <input
                      type="text"
                      value={tagDraft}
                      onChange={handleTagDraftChange}
                      onKeyDown={handleTagDraftKeyDown}
                      onBlur={() => addTagsFromValue(tagDraft)}
                      placeholder="태그 추가..."
                      className="h-8 min-w-[100px] flex-1 bg-transparent text-sm font-semibold text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)]"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

export default App;