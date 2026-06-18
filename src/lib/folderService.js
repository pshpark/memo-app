import { supabase } from "./supabaseClient";

export const DEFAULT_FOLDER_NAME = "기본 폴더";

export const loadFoldersWithDefault = async (userId) => {
  const { data: existingFolders, error: selectError } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (selectError) {
    throw selectError;
  }

  if (existingFolders.length > 0) {
    return existingFolders;
  }

  const { error: insertError } = await supabase.from("folders").insert({
    user_id: userId,
    name: DEFAULT_FOLDER_NAME,
    is_default: true,
  });

  if (insertError && insertError.code !== "23505") {
    throw insertError;
  }

  const { data: foldersAfterInsert, error: reselectError } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (reselectError) {
    throw reselectError;
  }

  return foldersAfterInsert;
};