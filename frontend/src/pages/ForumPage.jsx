import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";
import PostCard from "../components/forum/PostCard";
import { SkeletonCard } from "../components/ui/Skeleton";
import api from "../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

function createForumPostSchema(t) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t("forum.validationTitle"))
      .max(200, t("forum.validationTitleMax")),
    content: z
      .string()
      .trim()
      .min(20, t("forum.validationContentMin"))
      .max(10000, t("forum.validationContentMax")),
  });
}

export default function ForumPage() {
  const { groupId } = useParams();
  const { t } = useTranslation("app");

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(() => createForumPostSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "" },
  });

  const titleLen = watch("title", "").length;
  const contentLen = watch("content", "").length;

  const loadPosts = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get(
          `/groups/${groupId}/posts?page=${p}&limit=20`
        );
        if (p === 1) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);
        setPage(p);
      } catch {
        toast.error(t("forum.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [groupId, t]
  );

  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  const onCreatePost = async (formData) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/posts`, formData);
      setPosts((prev) => [data, ...prev]);
      reset();
      setShowForm(false);
      toast.success(t("forum.createSuccess"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("forum.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleForm = () => {
    setShowForm((s) => {
      if (s) reset();
      return !s;
    });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {t("forum.title")}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {t("forum.subtitle")}
              </p>
            </div>
            <Button onClick={toggleForm} variant="primary" size="sm">
              {showForm ? (
                t("forum.cancel")
              ) : (
                <>
                  <span className="hidden sm:inline">{t("forum.newPost")}</span>
                  <span className="sm:hidden">+ Post</span>
                </>
              )}
            </Button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit(onCreatePost)}
              className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-zebra-200 dark:border-teal-700 p-6 mb-6 space-y-4"
            >
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {t("forum.postTitle")}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("forum.titleLabel")}
                </label>
                <input
                  {...register("title")}
                  placeholder={t("forum.titlePlaceholder")}
                  maxLength={200}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-zebra-500 dark:focus:ring-teal-400 text-sm"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                  {titleLen}/200
                </p>
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("forum.contentLabel")}
                </label>
                <textarea
                  {...register("content")}
                  placeholder={t("forum.contentPlaceholder")}
                  rows={6}
                  maxLength={10000}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                           resize-none focus:outline-none focus:ring-2
                           focus:ring-zebra-500 dark:focus:ring-teal-400 text-sm leading-relaxed"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                  {contentLen}/10 000
                </p>
                {errors.content && (
                  <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("forum.visibleToMembers")}
                </p>
                <Button type="submit" disabled={submitting} loading={submitting}>
                  {t("forum.publish")}
                </Button>
              </div>
            </form>
          )}

          {loading && posts.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">
                {t("forum.noPosts")}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                {t("forum.noPostsHint")}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-6 text-zebra-600 dark:text-teal-400 font-semibold hover:underline text-sm"
              >
                {t("forum.writeFirst")}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} groupId={groupId} />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => loadPosts(page + 1)}
                    disabled={loading}
                    className="text-zebra-600 dark:text-teal-400 font-medium hover:underline
                             text-sm disabled:opacity-50"
                  >
                    {loading ? t("forum.loading") : t("forum.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
