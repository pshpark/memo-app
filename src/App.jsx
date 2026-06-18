import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { loadFoldersWithDefault } from "./lib/folderService";

const normalizeFolderFromDb = (folder) => ({
  id: folder.id,
  name: folder.name,
  isDefault: folder.is_default,
  createdAt: folder.created_at,
});

const normalizeMemoFromDb = (memo) => ({
  id: memo.id,
  title: memo.title || "제목 없음",
  content: memo.content || "",
  tags: Array.isArray(memo.tags) ? memo.tags : [],
  folderId: memo.folder_id,
  createdAt: memo.created_at,
  updatedAt: memo.updated_at || memo.created_at,
});

const sortMemosByUpdatedAt = (items) => {
  return [...items].sort((a, b) => {
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
  const [folders, setFolders] = useState([]);

  const [pageMode, setPageMode] = useState("dashboard");
  const [selectedMemoId, setSelectedMemoId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTag, setActiveTag] = useState("all");
  const [editingId, setEditingId] = useState(null);

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

  const defaultFolder = useMemo(() => {
    return folders.find((folder) => folder.isDefault) || folders[0] || null;
  }, [folders]);

  const folderMap = useMemo(() => {
    return folders.reduce((map, folder) => {
      map[folder.id] = folder;
      return map;
    }, {});
  }, [folders]);

  const selectedMemo = useMemo(() => {
    return memos.find((memo) => memo.id === selectedMemoId);
  }, [memos, selectedMemoId]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) {
      return null;
    }

    return folders.find((folder) => folder.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  const recentMemo = memos[0];

  const allTags = useMemo(() => {
    const tagSet = new Set();

    memos.forEach((memo) => {
      memo.tags.forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet);
  }, [memos]);

  const todayMemoCount = useMemo(() => {
    const today = new Date().toDateString();

    return memos.filter((memo) => {
      return new Date(memo.createdAt).toDateString() === today;
    }).length;
  }, [memos]);

  const memoMatchesFilters = useCallback(
    (memo) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        memo.title.toLowerCase().includes(keyword) ||
        memo.content.toLowerCase().includes(keyword) ||
        memo.tags.some((tag) => tag.toLowerCase().includes(keyword));

      const matchesTag = activeTag === "all" || memo.tags.includes(activeTag);

      return matchesSearch && matchesTag;
    },
    [search, activeTag]
  );

  const folderMemoCounts = useMemo(() => {
    return folders.reduce((counts, folder) => {
      counts[folder.id] = memos.filter(
        (memo) => memo.folderId === folder.id && memoMatchesFilters(memo)
      ).length;

      return counts;
    }, {});
  }, [folders, memos, memoMatchesFilters]);

  const filteredMemos = useMemo(() => {
    if (!selectedFolderId) {
      return [];
    }

    return memos.filter(
      (memo) => memo.folderId === selectedFolderId && memoMatchesFilters(memo)
    );
  }, [memos, selectedFolderId, memoMatchesFilters]);

  const loadWorkspaceData = useCallback(
    async (targetUser = user) => {
      if (!targetUser) {
        return;
      }

      setIsDataLoading(true);
      setDataError("");

      try {
        const folderRows = await loadFoldersWithDefault(targetUser.id);
        const nextFolders = folderRows.map(normalizeFolderFromDb);
        const nextDefaultFolder =
          nextFolders.find((folder) => folder.isDefault) || nextFolders[0];

        const { data: memoRows, error: memoError } = await supabase
          .from("memos")
          .select("*")
          .eq("user_id", targetUser.id)
          .order("updated_at", { ascending: false });

        if (memoError) {
          throw memoError;
        }

        const nextMemos = sortMemosByUpdatedAt(
          (memoRows || []).map(normalizeMemoFromDb)
        );

        setFolders(nextFolders);
        setMemos(nextMemos);

        setFolderId((prev) => {
          const hasPreviousFolder = nextFolders.some(
            (folder) => folder.id === prev
          );

          if (hasPreviousFolder) {
            return prev;
          }

          return nextDefaultFolder?.id || "";
        });

        setSelectedFolderId((prev) => {
          if (!prev) {
            return prev;
          }

          const hasSelectedFolder = nextFolders.some(
            (folder) => folder.id === prev
          );

          return hasSelectedFolder ? prev : null;
        });
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
      setFolders([]);
      setSelectedMemoId(null);
      setSelectedFolderId(null);
      setPageMode("dashboard");
      return;
    }

    loadWorkspaceData(user);
  }, [user, loadWorkspaceData]);

  useEffect(() => {
    if (activeTag !== "all" && !allTags.includes(activeTag)) {
      setActiveTag("all");
    }
  }, [activeTag, allTags]);

  useEffect(() => {
    if (pageMode === "detail" && selectedMemoId && !selectedMemo) {
      setSelectedMemoId(null);
      setPageMode(selectedFolderId ? "folder" : "dashboard");
    }
  }, [pageMode, selectedMemoId, selectedMemo, selectedFolderId]);

  useEffect(() => {
    if (selectedFolderId && !folderMap[selectedFolderId]) {
      setSelectedFolderId(null);
      setPageMode("dashboard");
    }
  }, [selectedFolderId, folderMap]);

  useEffect(() => {
    if (!folderId && defaultFolder) {
      setFolderId(defaultFolder.id);
    }
  }, [folderId, defaultFolder]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTagInput("");
    setFolderId(defaultFolder?.id || folders[0]?.id || "");
    setEditingId(null);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    const email = authEmail.trim();

    if (!email || !authPassword.trim()) {
      setAuthMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage("");

    try {
      if (authMode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: authPassword,
        });

        if (error) {
          throw error;
        }

        setAuthEmail("");
        setAuthPassword("");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: authPassword,
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
    setFolders([]);
    setSelectedMemoId(null);
    setSelectedFolderId(null);
    setPageMode("dashboard");
  };

  const openCreatePage = (targetFolderId = null) => {
    resetForm();

    const nextFolderId = targetFolderId || defaultFolder?.id || folders[0]?.id;

    if (nextFolderId) {
      setFolderId(nextFolderId);
    }

    setSelectedMemoId(null);

    if (targetFolderId) {
      setSelectedFolderId(targetFolderId);
    }

    setPageMode("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditPage = (memo, event) => {
    event?.stopPropagation();

    setTitle(memo.title);
    setContent(memo.content);
    setTagInput(memo.tags.join(", "));
    setFolderId(memo.folderId || defaultFolder?.id || folders[0]?.id || "");
    setEditingId(memo.id);
    setSelectedMemoId(memo.id);
    setSelectedFolderId(memo.folderId || null);
    setPageMode("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDetailPage = (memoId) => {
    const memo = memos.find((item) => item.id === memoId);

    if (memo) {
      setSelectedFolderId(memo.folderId || null);
    }

    setSelectedMemoId(memoId);
    setPageMode("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openFolderPage = (targetFolderId) => {
    setSelectedFolderId(targetFolderId);
    setPageMode("folder");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeEditorPage = () => {
    const shouldReturnDetail = Boolean(editingId && selectedMemoId);

    resetForm();

    if (shouldReturnDetail) {
      setPageMode("detail");
      return;
    }

    if (selectedFolderId) {
      setPageMode("folder");
      return;
    }

    setPageMode("dashboard");
  };

  const closeDetailPage = () => {
    setSelectedMemoId(null);

    if (selectedMemo?.folderId) {
      setSelectedFolderId(selectedMemo.folderId);
      setPageMode("folder");
      return;
    }

    setPageMode("dashboard");
  };

  const goDashboard = () => {
    setSelectedMemoId(null);
    setSelectedFolderId(null);
    setPageMode("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateFolder = async (event) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const nextFolderName = folderName.trim();

    if (!nextFolderName) {
      return;
    }

    const isDuplicated = folders.some(
      (folder) => folder.name.toLowerCase() === nextFolderName.toLowerCase()
    );

    if (isDuplicated) {
      alert("이미 같은 이름의 폴더가 있어요.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folders")
        .insert({
          user_id: user.id,
          name: nextFolderName,
          is_default: false,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const newFolder = normalizeFolderFromDb(data);

      setFolders((prev) => [...prev, newFolder]);
      setFolderName("");
      setIsFolderFormOpen(false);
    } catch (error) {
      console.error(error);
      alert(error.message || "폴더를 추가하지 못했어요.");
    }
  };

  const handleRenameFolder = async (targetFolder, event) => {
    event?.stopPropagation();

    if (!user) {
      return;
    }

    const nextName = window.prompt("폴더 이름을 입력하세요.", targetFolder.name);

    if (!nextName) {
      return;
    }

    const trimmedName = nextName.trim();

    if (!trimmedName) {
      return;
    }

    const isDuplicated = folders.some(
      (folder) =>
        folder.id !== targetFolder.id &&
        folder.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicated) {
      alert("이미 같은 이름의 폴더가 있어요.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folders")
        .update({ name: trimmedName })
        .eq("id", targetFolder.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updatedFolder = normalizeFolderFromDb(data);

      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === updatedFolder.id ? updatedFolder : folder
        )
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "폴더 이름을 변경하지 못했어요.");
    }
  };

  const handleDeleteFolder = async (targetFolder, event) => {
    event?.stopPropagation();

    if (!user || !defaultFolder) {
      return;
    }

    if (targetFolder.isDefault) {
      alert("기본 폴더는 삭제할 수 없어요.");
      return;
    }

    const confirmed = window.confirm(
      `"${targetFolder.name}" 폴더를 삭제할까요?\n폴더 안의 메모는 기본 폴더로 이동됩니다.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const now = new Date().toISOString();

      const { error: moveError } = await supabase
        .from("memos")
        .update({
          folder_id: defaultFolder.id,
          updated_at: now,
        })
        .eq("user_id", user.id)
        .eq("folder_id", targetFolder.id);

      if (moveError) {
        throw moveError;
      }

      const { error: deleteError } = await supabase
        .from("folders")
        .delete()
        .eq("id", targetFolder.id)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setFolders((prev) =>
        prev.filter((folder) => folder.id !== targetFolder.id)
      );

      setMemos((prev) =>
        sortMemosByUpdatedAt(
          prev.map((memo) =>
            memo.folderId === targetFolder.id
              ? {
                  ...memo,
                  folderId: defaultFolder.id,
                  updatedAt: now,
                }
              : memo
          )
        )
      );

      if (selectedFolderId === targetFolder.id) {
        setSelectedFolderId(null);
        setPageMode("dashboard");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "폴더를 삭제하지 못했어요.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!title.trim() && !content.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const parsedTags = parseTags(tagInput);
    const nextFolderId = folderId || defaultFolder?.id || folders[0]?.id;

    if (!nextFolderId) {
      alert("폴더 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("memos")
          .update({
            title: title.trim() || "제목 없음",
            content: content.trim(),
            tags: parsedTags,
            folder_id: nextFolderId,
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
          sortMemosByUpdatedAt(
            prev.map((memo) =>
              memo.id === updatedMemo.id ? updatedMemo : memo
            )
          )
        );

        setSelectedMemoId(editingId);
        setSelectedFolderId(nextFolderId);
        resetForm();
        setPageMode("detail");
      } else {
        const { data, error } = await supabase
          .from("memos")
          .insert({
            user_id: user.id,
            folder_id: nextFolderId,
            title: title.trim() || "제목 없음",
            content: content.trim(),
            tags: parsedTags,
            updated_at: now,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const newMemo = normalizeMemoFromDb(data);

        setMemos((prev) => sortMemosByUpdatedAt([newMemo, ...prev]));
        setSelectedMemoId(newMemo.id);
        setSelectedFolderId(nextFolderId);
        resetForm();
        setPageMode("detail");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "메모를 저장하지 못했어요.");
    }
  };

  const handleDelete = async (id, event) => {
    event?.stopPropagation();

    if (!user) {
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
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMemos((prev) => prev.filter((memo) => memo.id !== id));

      if (editingId === id) {
        resetForm();
      }

      if (selectedMemoId === id) {
        setSelectedMemoId(null);
        setPageMode(selectedFolderId ? "folder" : "dashboard");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "메모를 삭제하지 못했어요.");
    }
  };

  const handleTagFilter = (tag, event) => {
    event?.stopPropagation();

    setActiveTag(tag);

    if (selectedMemo?.folderId) {
      setSelectedFolderId(selectedMemo.folderId);
      setPageMode("folder");
    } else if (selectedFolderId) {
      setPageMode("folder");
    } else {
      setPageMode("dashboard");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCardKeyDown = (event, memoId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetailPage(memoId);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setIsSearchOpen(false);
  };

  const resetFilters = () => {
    setActiveTag("all");
    setSearch("");
    setIsSearchOpen(false);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const formatCompactDate = (dateString) => {
    const date = new Date(dateString);

    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}${month}${day} ${hours}:${minutes}`;
  };

  const formatDay = () => {
    return new Intl.DateTimeFormat("ko-KR", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  };

  if (isBooting) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#EEF4FF] px-4 text-slate-950">
        <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
          <p className="text-sm font-black tracking-[0.2em] text-blue-400">
            LOADING
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">
            Memo Space
          </h1>
        </section>
      </main>
    );
  }

  if (!session || !user) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#EEF4FF] px-4 py-8 text-slate-950">
        <section className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)] sm:p-8">
          <p className="mb-3 text-xs font-black tracking-[0.2em] text-blue-400">
            PRIVATE MEMO APP
          </p>

          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.075em]">
            Memo
            <br />
            Space
          </h1>

          <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
            Supabase 계정으로 로그인하면 PC와 모바일에서 같은 메모를 볼 수
            있어요.
          </p>

          <form onSubmit={handleAuthSubmit} className="mt-8">
            <label className="block text-sm font-extrabold text-slate-900">
              이메일
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-3 h-[54px] w-full rounded-xl border border-blue-950/10 bg-blue-50 px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label className="mt-5 block text-sm font-extrabold text-slate-900">
              비밀번호
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="6자 이상"
                className="mt-3 h-[54px] w-full rounded-xl border border-blue-950/10 bg-blue-50 px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            {authMessage && (
              <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-700">
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="mt-6 h-14 w-full rounded-full bg-[#2563EB] font-extrabold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
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
            className="mt-4 w-full rounded-full border border-blue-950/10 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50"
          >
            {authMode === "signIn"
              ? "처음이라면 회원가입하기"
              : "이미 계정이 있다면 로그인하기"}
          </button>
        </section>
      </main>
    );
  }

  if (isDataLoading && folders.length === 0) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#EEF4FF] px-4 text-slate-950">
        <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
          <p className="text-sm font-black tracking-[0.2em] text-blue-400">
            SYNCING
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">
            데이터를 불러오는 중
          </h1>
        </section>
      </main>
    );
  }

  if (pageMode === "editor") {
    return (
      <main className="min-h-dvh bg-[#EEF4FF] text-slate-950">
        <section className="mx-auto flex min-h-dvh w-full max-w-[960px] flex-col px-4 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 border-b border-blue-950/10 pb-5">
            <button
              type="button"
              onClick={closeEditorPage}
              className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-[#2563EB] hover:text-white"
            >
              ← 뒤로
            </button>

            <p className="text-sm font-bold text-slate-400">
              {editingId ? "EDIT MEMO" : "NEW MEMO"}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
                {editingId ? "메모 수정" : "메모 작성"}
              </h1>
              <p className="mt-3 text-slate-500">
                제목, 내용, 해시태그와 폴더를 설정해서 메모를 정리하세요.
              </p>
            </div>

            <label className="block text-sm font-extrabold text-slate-900">
              제목
              <input
                type="text"
                placeholder="메모 제목"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-3 h-[56px] w-full rounded-xl border border-blue-950/10 bg-white px-4 text-lg font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label className="mt-6 block text-sm font-extrabold text-slate-900">
              폴더
              <select
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                className="mt-3 h-[56px] w-full rounded-xl border border-blue-950/10 bg-white px-4 text-slate-950 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-6 block text-sm font-extrabold text-slate-900">
              해시태그
              <input
                type="text"
                placeholder="예: 업무, 아이디어, 중요"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                className="mt-3 h-[56px] w-full rounded-xl border border-blue-950/10 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            {parseTags(tagInput).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {parseTags(tagInput).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#2563EB] bg-[#2563EB] px-3 py-1 text-xs font-bold text-white"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <label className="mt-6 flex flex-1 flex-col text-sm font-extrabold text-slate-900">
              내용
              <textarea
                placeholder="내용을 입력하세요"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="mt-3 min-h-[360px] flex-1 resize-none rounded-xl border border-blue-950/10 bg-white p-5 text-base leading-8 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-blue-950/10 bg-[#EEF4FF] py-5">
              <button
                type="button"
                onClick={closeEditorPage}
                className="h-14 flex-1 rounded-full border border-blue-950/10 bg-white font-extrabold text-slate-800 transition hover:bg-blue-50"
              >
                취소
              </button>

              <button
                type="submit"
                className="h-14 flex-[2] rounded-full bg-[#2563EB] font-extrabold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
              >
                {editingId ? "수정 완료" : "메모 추가"}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (pageMode === "detail" && selectedMemo) {
    const memoFolder = folderMap[selectedMemo.folderId] || defaultFolder;

    return (
      <main className="min-h-dvh bg-[#EEF4FF] text-slate-950">
        <section className="mx-auto flex min-h-dvh w-full max-w-[960px] flex-col px-4 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4 border-b border-blue-950/10 pb-5">
            <button
              type="button"
              onClick={closeDetailPage}
              className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-[#2563EB] hover:text-white"
            >
              ← 목록
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={(event) => openEditPage(selectedMemo, event)}
                className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-[#2563EB] hover:text-white"
              >
                수정
              </button>

              <button
                type="button"
                onClick={(event) => handleDelete(selectedMemo.id, event)}
                className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-950 hover:text-white"
              >
                삭제
              </button>
            </div>
          </header>

          <article className="flex flex-1 flex-col py-8">
            <div className="mb-6">
              <p className="mb-3 text-xs font-black tracking-[0.2em] text-blue-400">
                MEMO DETAIL
              </p>

              <h1 className="break-words text-4xl font-black leading-tight tracking-[-0.06em] text-slate-950 sm:text-6xl">
                {selectedMemo.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-slate-400">
                {memoFolder && <span>폴더 {memoFolder.name}</span>}
                <span>작성 {formatDate(selectedMemo.createdAt)}</span>
                <span>수정 {formatDate(selectedMemo.updatedAt)}</span>
              </div>
            </div>

            <div className="mb-8 flex flex-wrap gap-2">
              {memoFolder && (
                <button
                  type="button"
                  onClick={() => openFolderPage(memoFolder.id)}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                >
                  📁 {memoFolder.name}
                </button>
              )}

              {selectedMemo.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(event) => handleTagFilter(tag, event)}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                >
                  #{tag}
                </button>
              ))}
            </div>

            <div className="flex-1 rounded-[20px] border border-blue-950/10 bg-white p-5 shadow-[0_12px_30px_rgba(37,99,235,0.08)] sm:p-7">
              <p className="whitespace-pre-wrap break-words text-lg leading-9 text-slate-700">
                {selectedMemo.content || "내용 없음"}
              </p>
            </div>
          </article>
        </section>
      </main>
    );
  }

  const isFolderPage = pageMode === "folder" && selectedFolder;

  return (
    <main className="min-h-dvh bg-[#EEF4FF] text-slate-950">
      <section className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-8 lg:px-10">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-black tracking-[-0.03em] text-slate-950">
              Memo challenge
            </p>
            <p className="text-xs font-bold text-slate-400">{formatDay()}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`grid h-12 w-12 place-items-center rounded-full border text-lg font-black transition ${
                isSearchOpen || search
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-blue-950/10 bg-white text-slate-950 hover:border-[#2563EB] hover:text-[#2563EB]"
              }`}
              aria-label="검색 열기"
            >
              ⌕
            </button>

            <button
              type="button"
              onClick={() =>
                openCreatePage(isFolderPage ? selectedFolder.id : null)
              }
              className="h-12 rounded-full bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
            >
              메모 작성
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="hidden h-12 rounded-full border border-blue-950/10 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-blue-50 sm:block"
            >
              로그아웃
            </button>
          </div>
        </header>

        {dataError && (
          <section className="mb-6 rounded-[20px] border border-blue-200 bg-white p-4 text-sm font-semibold text-blue-700">
            {dataError}
            <button
              type="button"
              onClick={() => loadWorkspaceData(user)}
              className="ml-3 font-black underline"
            >
              다시 시도
            </button>
          </section>
        )}

        {(isSearchOpen || search) && (
          <section className="mb-6 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                autoFocus
                placeholder="제목, 내용, 해시태그 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-[52px] w-full rounded-full border border-blue-950/10 bg-white px-5 pr-12 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-blue-50 text-sm font-black text-blue-500 transition hover:bg-[#2563EB] hover:text-white"
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>
          </section>
        )}

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)] sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h1 className="max-w-[520px] text-5xl font-black leading-[0.98] tracking-[-0.075em] text-slate-950 sm:text-6xl">
                  Check Your
                  <br />
                  Memo Space
                </h1>

                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-black text-slate-400">Today</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
                      {todayMemoCount}
                      <span className="ml-1 text-base text-slate-400">
                        notes
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-400">Total</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
                      {memos.length}
                      <span className="ml-1 text-base text-slate-400">
                        memos
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  openCreatePage(isFolderPage ? selectedFolder.id : null)
                }
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-blue-950/10 bg-blue-50 text-2xl font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                aria-label="새 메모 작성"
              >
                +
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  openCreatePage(isFolderPage ? selectedFolder.id : null)
                }
                className="rounded-[22px] bg-[#2563EB] p-5 text-left text-white transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-[0_14px_28px_rgba(37,99,235,0.24)]"
              >
                <div className="mb-10 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#2563EB]">
                    ✦
                  </span>
                  <div>
                    <p className="font-black">Quick Memo</p>
                    <p className="text-sm font-semibold text-white/65">
                      바로 기록하기
                    </p>
                  </div>
                </div>

                <p className="text-4xl font-black tracking-[-0.06em]">Write</p>
                <p className="mt-1 text-sm font-bold text-white/65">
                  새 아이디어를 추가하세요
                </p>
              </button>

              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => recentMemo && openDetailPage(recentMemo.id)}
                  className="rounded-[22px] bg-[#BFD7FF] p-5 text-left text-slate-950 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
                >
                  <p className="text-sm font-black text-blue-900/55">
                    Recent memo
                  </p>
                  <p className="mt-8 text-3xl font-black tracking-[-0.06em]">
                    {recentMemo
                      ? formatCompactDate(recentMemo.updatedAt).slice(-5)
                      : "--:--"}
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-blue-950/60">
                    {recentMemo ? recentMemo.title : "아직 메모가 없어요"}
                  </p>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[22px] bg-[#DCEBFF] p-4">
                    <p className="text-3xl font-black tracking-[-0.06em] text-slate-950">
                      {memos.length}
                    </p>
                    <p className="mt-5 text-sm font-black text-blue-900/60">
                      Saved
                    </p>
                  </div>

                  <div className="rounded-[22px] bg-[#D7E2FF] p-4">
                    <p className="text-3xl font-black tracking-[-0.06em] text-slate-950">
                      {folders.length}
                    </p>
                    <p className="mt-5 text-sm font-black text-blue-900/60">
                      Folders
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-5">
            <section className="rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
              <div className="mb-5 flex items-center justify-between">
                <p className="font-black text-slate-950">Tags</p>
                <span className="text-sm font-black text-slate-400">
                  {allTags.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTag("all")}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    activeTag === "all"
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-blue-950/10 bg-blue-50 text-slate-800 hover:border-[#2563EB] hover:text-[#2563EB]"
                  }`}
                >
                  전체
                </button>

                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      activeTag === tag
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-blue-950/10 bg-blue-50 text-slate-800 hover:border-[#2563EB] hover:text-[#2563EB]"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
              <div className="mb-5 flex items-center justify-between">
                <p className="font-black text-slate-950">Folders</p>

                <button
                  type="button"
                  onClick={() => setIsFolderFormOpen((prev) => !prev)}
                  className={`grid h-9 w-9 place-items-center rounded-full border text-lg font-black transition ${
                    isFolderFormOpen
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-blue-950/10 bg-blue-50 text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                  }`}
                  aria-label="폴더 생성"
                >
                  +
                </button>
              </div>

              {isFolderFormOpen && (
                <form onSubmit={handleCreateFolder} className="mb-4 flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="새 폴더명"
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-full border border-blue-950/10 bg-blue-50 px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="submit"
                    className="h-11 rounded-full bg-[#2563EB] px-4 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8]"
                  >
                    추가
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => openFolderPage(folder.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      selectedFolderId === folder.id && pageMode === "folder"
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-blue-950/10 bg-blue-50 text-slate-800 hover:border-[#2563EB] hover:text-[#2563EB]"
                    }`}
                  >
                    {folder.name}
                    <span className="ml-1 opacity-60">
                      {folderMemoCounts[folder.id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>

        {isFolderPage ? (
          <>
            <section className="mb-4 flex items-end justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={goDashboard}
                  className="mb-3 rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-blue-50"
                >
                  ← 폴더 목록
                </button>

                <p className="text-xs font-black tracking-[0.2em] text-blue-400">
                  FOLDER MEMOS
                </p>
                <h2 className="mt-1 max-w-[720px] truncate text-3xl font-black tracking-[-0.06em] text-slate-950">
                  {selectedFolder.name}
                  <span className="ml-2 text-lg text-slate-400">
                    {filteredMemos.length}
                  </span>
                </h2>
              </div>

              {(activeTag !== "all" || search) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-blue-50"
                >
                  필터 초기화
                </button>
              )}
            </section>

            {filteredMemos.length === 0 ? (
              <section className="grid min-h-[340px] place-content-center rounded-[24px] border border-dashed border-blue-300 bg-white p-8 text-center">
                <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                  이 폴더에 표시할 메모가 없어요
                </h2>

                <p className="mt-3 text-slate-500">
                  새 메모를 작성하거나 검색어와 필터를 변경해보세요.
                </p>

                <button
                  type="button"
                  onClick={() => openCreatePage(selectedFolder.id)}
                  className="mx-auto mt-6 h-12 rounded-full bg-[#2563EB] px-6 font-extrabold text-white transition hover:bg-[#1D4ED8]"
                >
                  이 폴더에 메모 작성하기
                </button>
              </section>
            ) : (
              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 max-md:gap-3">
                {filteredMemos.map((memo) => (
                  <article
                    key={memo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetailPage(memo.id)}
                    onKeyDown={(event) => handleCardKeyDown(event, memo.id)}
                    className="flex min-h-[248px] cursor-pointer flex-col rounded-[22px] border border-blue-950/10 bg-white p-6 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,99,235,0.11)] focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 max-md:min-h-0 max-md:rounded-[18px] max-md:p-4"
                  >
                    <div className="mb-4 min-w-0 max-md:mb-2">
                      <h2 className="truncate text-2xl font-black leading-tight tracking-[-0.05em] text-slate-950 max-md:text-lg">
                        {memo.title}
                      </h2>
                    </div>

                    {memo.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 max-md:mb-2 max-md:max-h-7 max-md:overflow-hidden">
                        {memo.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={(event) => handleTagFilter(tag, event)}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white max-md:px-2.5 max-md:py-0.5 max-md:text-[11px]"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="max-h-[168px] overflow-hidden whitespace-pre-wrap break-words leading-7 text-slate-600 max-md:[display:-webkit-box] max-md:[-webkit-box-orient:vertical] max-md:[-webkit-line-clamp:2] max-md:max-h-none max-md:whitespace-normal max-md:text-sm max-md:leading-6">
                      {memo.content || "내용 없음"}
                    </p>

                    <div className="mt-auto pt-5 text-right text-xs font-bold text-slate-400 max-md:pt-3 max-md:text-[11px]">
                      {formatCompactDate(memo.updatedAt)}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : (
          <>
            <section className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-blue-400">
                  FOLDER LIST
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.06em] text-slate-950">
                  Folders
                </h2>
              </div>

              {(activeTag !== "all" || search) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-blue-950/10 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-blue-50"
                >
                  필터 초기화
                </button>
              )}
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 max-md:gap-3">
              {folders.map((folder) => (
                <article
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openFolderPage(folder.id)}
                  className="flex min-h-[210px] cursor-pointer flex-col rounded-[22px] border border-blue-950/10 bg-white p-6 outline-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,99,235,0.11)] focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 max-md:min-h-0 max-md:rounded-[18px] max-md:p-4"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-black tracking-[0.16em] text-blue-400">
                        FOLDER
                      </p>
                      <h3 className="truncate text-2xl font-black tracking-[-0.05em] text-slate-950 max-md:text-xl">
                        {folder.name}
                      </h3>
                    </div>

                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-xl">
                      📁
                    </span>
                  </div>

                  <div className="mt-auto">
                    <p className="text-4xl font-black tracking-[-0.06em] text-slate-950">
                      {folderMemoCounts[folder.id] || 0}
                      <span className="ml-2 text-base text-slate-400">
                        memos
                      </span>
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={(event) => handleRenameFolder(folder, event)}
                        className="rounded-full border border-blue-950/10 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                      >
                        이름변경
                      </button>

                      {!folder.isDefault && (
                        <button
                          type="button"
                          onClick={(event) => handleDeleteFolder(folder, event)}
                          className="rounded-full border border-blue-950/10 bg-blue-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-950 hover:text-white"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default App;