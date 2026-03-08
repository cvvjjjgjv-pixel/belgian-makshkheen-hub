import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Stories from "@/components/Stories";
import LiveMatchCard from "@/components/LiveMatchCard";
import CreatePostForm from "@/components/CreatePostForm";
import PostsFeed from "@/components/PostsFeed";
import MagicPrediction from "@/components/MagicPrediction";
import TVTab from "@/components/TVTab";
import ChatTab from "@/components/ChatTab";
import ProfileTab from "@/components/ProfileTab";
import NewsTab from "@/components/NewsTab";
import ForumTab from "@/components/ForumTab";

type Tab = "accueil" | "tv" | "news" | "forum" | "chat" | "profil";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("accueil");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_settings")
        .select("dark_mode")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && !data.dark_mode) {
        document.documentElement.classList.add("light-mode");
      }
    };
    loadTheme();
  }, []);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader />

      <main className="pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "accueil" && (
              <>
                <Stories />
                <LiveMatchCard />
                <MagicPrediction />
                <CreatePostForm onPostCreated={() => setRefreshKey((k) => k + 1)} />
                <PostsFeed refreshKey={refreshKey} />
              </>
            )}
            {activeTab === "tv" && <TVTab />}
            {activeTab === "news" && <NewsTab />}
            {activeTab === "forum" && <ForumTab />}
            {activeTab === "chat" && <ChatTab />}
            {activeTab === "profil" && <ProfileTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
