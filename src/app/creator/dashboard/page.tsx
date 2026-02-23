"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";
import { formatTimestamp } from "@/lib/formatTimestamp";

type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");

  const { setEmail, lookupByEmail } = useCreatorAdmin();

  React.useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users-list");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to fetch users");
        }
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    if (!filter.trim()) return users;
    const q = filter.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)),
    );
  }, [users, filter]);

  const handleSelectUser = (userEmail: string) => {
    setEmail(userEmail);
    void lookupByEmail(userEmail);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading users…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Total registered users: <strong>{total}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Filter by name or email…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />

          <div className="rounded-md border max-h-150 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      {filter
                        ? "No users match the filter."
                        : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectUser(user.email)}
                    >
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.name ?? "—"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {formatTimestamp(user.last_sign_in_at)}
                      </TableCell>
                      <TableCell>{formatTimestamp(user.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
