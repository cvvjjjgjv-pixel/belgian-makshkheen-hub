import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import roshaneTechImg from "@/assets/roshane-tech.jpeg";

const RoshaneTechAd = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-3 my-3"
    >
      <a
        href="https://roshanetech.be"
        target="_blank"
        rel="noopener noreferrer"
        className="block relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(230,40%,12%)] to-[hsl(280,30%,15%)] shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-medium text-muted-foreground/60 bg-background/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            Sponsorisé
          </span>
        </div>

        <div className="flex items-center gap-4 p-4">
          <img
            src={roshaneTechImg}
            alt="Roshane Tech"
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-wide">
              ROSHANE TECH
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Créez votre digital en Belgique 🇧🇪
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Sites web • Apps • Solutions digitales
            </p>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
              <span>Découvrir</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>
      </a>
    </motion.div>
  );
};

export default RoshaneTechAd;
