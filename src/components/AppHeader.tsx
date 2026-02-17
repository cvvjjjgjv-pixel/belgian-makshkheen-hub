import { Bell, User } from "lucide-react";
import logo from "@/assets/logo.png";

const AppHeader = () => {
  return (
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
          <button className="relative text-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold">3</span>
          </button>
          <button className="text-foreground">
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
