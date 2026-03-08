import { useState, useEffect } from "react";
import { Bell, User } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NotificationsPanel from "./NotificationsPanel";

const AppHeader = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchCount();

    // Realtime for new notifications
    const channel = supabase
      .channel("notif-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-50 gradient-header border-b-2 border-accent">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-full border-2 border-accent object-cover" />
            <div>
              <h1 className="font-arabic text-lg font-bold text-accent">مكشخين بلجيكا</h1>
              <p className="text-xs text-foreground/70">Makshkheen Belgium</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifs(true)} className="relative text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button className="text-foreground">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <NotificationsPanel open={showNotifs} onClose={() => setShowNotifs(false)} />
    </>
  );
};

export default AppHeader;