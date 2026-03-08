import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "user" | "admin" | "super_admin";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      console.log("🔍 Fetching roles for user:", user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      console.log("📊 Role query result:", { data, error });
      if (!error && data) {
        const mappedRoles = data.map((r: any) => r.role as AppRole);
        console.log("✅ Roles set:", mappedRoles);
        setRoles(mappedRoles);
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  return { roles, loading, isAdmin, isSuperAdmin };
};
