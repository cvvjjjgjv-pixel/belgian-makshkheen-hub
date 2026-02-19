import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Stories from "@/components/Stories";
import LiveMatchCard from "@/components/LiveMatchCard";
import FeedPost from "@/components/FeedPost";
import TVTab from "@/components/TVTab";
import ChatTab from "@/components/ChatTab";
import ProfileTab from "@/components/ProfileTab";
import NewsTab from "@/components/NewsTab";

type Tab = "accueil" | "tv" | "news" | "chat" | "profil";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("accueil");

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
                <FeedPost
                  username="Mohamed_Makshakh"
                  avatar="https://i.pravatar.cc/150?img=5"
                  time="Il y a 2h"
                  location="Bruxelles"
                  image="https://images.unsplash.com/photo-1522778119026-d647f0565c6a?w=800&q=80"
                  caption="Tifo incroyable hier soir! 🔴🟡"
                  hashtags="#Makshkheen #EST #BloodAndGold"
                  likes="234"
                  comments="45"
                  isLiked
                />
                <FeedPost
                  username="Cellule_Officielle"
                  avatar="https://i.pravatar.cc/150?img=6"
                  time="Il y a 4h"
                  location="Anvers"
                  image="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"
                  caption="Le but de la victoire! 🏆"
                  hashtags="#EST #ChampionsLeague"
                  likes="1.2K"
                  comments="89"
                  isVideo
                  duration="02:45"
                />
                <FeedPost
                  username="Ultra_Rouge_07"
                  avatar="https://i.pravatar.cc/150?img=7"
                  time="Il y a 6h"
                  location="Gand"
                  image="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80"
                  caption="Les couleurs de notre vie 🔴🟡❤️"
                  hashtags="#EST #Ultras #Belgique"
                  likes="567"
                  comments="32"
                />
              </>
            )}
            {activeTab === "tv" && <TVTab />}
            {activeTab === "news" && <NewsTab />}
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
