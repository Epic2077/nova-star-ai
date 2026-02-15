"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";

function ObjectTable({
  data,
}: {
  data: Record<string, unknown> | null | undefined;
}) {
  const entries = Object.entries(data ?? {});

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-48">Field</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="font-medium">{key}</TableCell>
            <TableCell className="whitespace-pre-wrap wrap-break-word">
              {typeof value === "object" && value !== null
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CreatorUserPage() {
  const { result } = useCreatorAdmin();

  return (
    <div className="space-y-6">
      {result ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Auth User Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-40">ID</TableCell>
                    <TableCell>{result.user.id}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Email</TableCell>
                    <TableCell>{result.user.email}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Auth Role</TableCell>
                    <TableCell>{result.user.role}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Created</TableCell>
                    <TableCell>{result.user.created_at}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Last Sign In</TableCell>
                    <TableCell>{result.user.last_sign_in_at ?? "-"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profiles Table Row</CardTitle>
            </CardHeader>
            <CardContent>
              <ObjectTable data={result.profile} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auth App Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <ObjectTable data={result.user.app_metadata} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auth User Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <ObjectTable data={result.user.user_metadata} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Search for a user email above to view user and profile data.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
