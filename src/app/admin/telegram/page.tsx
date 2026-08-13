"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import type { ParsedSupplierMessage } from "@/server/providers/telegram/types";

interface TelegramAdminData {
  configured: boolean;
  account: string;
  targetGroup: string;
  apiIdConfigured: boolean;
  sessionConfigured: boolean;
  recentLogs: Array<{
    id: string;
    orderId: string | null;
    request: string | null;
    response: string | null;
    success: boolean | null;
    errorMessage: string | null;
    createdAt: string;
    order?: { orderNumber: string; freeFireUid: string } | null;
  }>;
}

export default function AdminTelegramPage() {
  const [data, setData] = useState<TelegramAdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parser tester state
  const [sampleMsgText, setSampleMsgText] = useState(
    `TOPUP DONE\n\nOrder ID : #6525\nUser     : reseller\nUID      : 3125514892\n\nUPBD-P-S-02690368\n8756-4674-7943-2555\n\nDelivered\n\nPackage  : 20 Unipin Code × 1\nDuration : 10.67s`
  );
  const [parsedResult, setParsedResult] = useState<ParsedSupplierMessage | null>(null);

  // Formatter tester state
  const [cmdTemplate, setCmdTemplate] = useState("bduc {uid} 115");
  const [testUid, setTestUid] = useState("3125514892");
  const [formattedCmd, setFormattedCmd] = useState("");

  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/telegram/test");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load Telegram status");
      } else {
        setData(json.data);
      }
    } catch {
      setError("Network error loading Telegram status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle parser test
  async function handleTestParser() {
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARSE_TEST",
          messageText: sampleMsgText,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setParsedResult(json.data);
      }
    } catch {
      toast.error("Failed to parse sample message");
    }
  }

  // Handle format test
  async function handleTestFormat() {
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FORMAT_TEST",
          template: cmdTemplate,
          freeFireUid: testUid,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFormattedCmd(json.data.formatted);
      }
    } catch {
      toast.error("Failed to format command");
    }
  }

  // Handle send dev test
  async function handleSendDevTest() {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEND_DEV_TEST" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Test message failed");
      } else {
        toast.success(json.data.message ?? "Test message sent to Telegram group!");
        fetchStatus();
      }
    } catch {
      toast.error("Network error sending test message");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Telegram Reseller Integration (@aslar55)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MTProto provider configuration, command formatting, defensive supplier message parser, and audit logs
        </p>
      </div>

      {isLoading ? (
        <div className="py-12">
          <Loading text="Loading Telegram provider status..." />
        </div>
      ) : error ? (
        <ErrorDisplay message={error} retry={fetchStatus} />
      ) : (
        <>
          {/* Status & Configuration Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Provider Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      data?.configured
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                        : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200"
                    }
                  >
                    {data?.configured ? "Ready / Configured" : "Credentials Required"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  MTProto User Account: <strong className="text-foreground">{data?.account}</strong>
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Target Reseller Group
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-bold text-base text-foreground">
                  {data?.targetGroup}
                </div>
                <p className="text-xs text-muted-foreground">
                  Private supplier command channel
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Safe Integration Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleSendDevTest}
                  disabled={isSendingTest || !data?.configured}
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSendingTest ? "Sending..." : "Send Developer Test Text"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Sends a safe developer text to {data?.targetGroup} without triggering paid top-ups.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Tools Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Command Formatter Tester */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Supplier Command Formatter
                </CardTitle>
                <CardDescription>
                  Tests replacement of {"{uid}"} placeholder with customer Free Fire UID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Command Template</label>
                  <Input
                    value={cmdTemplate}
                    onChange={(e) => setCmdTemplate(e.target.value)}
                    placeholder="e.g. bduc {uid} 115"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Sample Free Fire UID</label>
                  <Input
                    value={testUid}
                    onChange={(e) => setTestUid(e.target.value)}
                    placeholder="e.g. 3125514892"
                  />
                </div>
                <Button onClick={handleTestFormat} size="sm" variant="outline" className="w-full">
                  Format Command
                </Button>

                {formattedCmd && (
                  <div className="rounded-md bg-muted p-3 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">Formatted Result:</span>
                    <code className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                      {formattedCmd}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Defensive Parser Tester */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Supplier Response Parser Tester
                </CardTitle>
                <CardDescription>
                  Test defensive parsing of raw Telegram supplier messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Raw Telegram Message</label>
                  <textarea
                    rows={5}
                    value={sampleMsgText}
                    onChange={(e) => setSampleMsgText(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button onClick={handleTestParser} size="sm" className="w-full bg-emerald-600 text-white">
                  Test Response Parser
                </Button>

                {parsedResult && (
                  <div className="rounded-md bg-muted p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-muted-foreground">Parsed Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          parsedResult.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            : parsedResult.status === "FAILED"
                            ? "bg-red-500/10 text-red-700 border-red-200"
                            : "bg-yellow-500/10 text-yellow-700 border-yellow-200"
                        }
                      >
                        {parsedResult.status}
                      </Badge>
                    </div>
                    <div className="grid gap-1 font-mono text-[11px]">
                      <div><strong>Supplier Order ID:</strong> {parsedResult.supplierOrderId ?? "None"}</div>
                      <div><strong>Free Fire UID:</strong> {parsedResult.freeFireUid ?? "None"}</div>
                      <div><strong>Package:</strong> {parsedResult.packageName ?? "None"}</div>
                      <div><strong>Delivery Status:</strong> {parsedResult.deliveryStatus ?? "None"}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Provider Audit Logs Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                Telegram Provider Audit Logs ({data?.recentLogs.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentLogs.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No provider logs recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Log ID</th>
                        <th className="px-4 py-3 font-semibold">Order Number</th>
                        <th className="px-4 py-3 font-semibold">Request Payload</th>
                        <th className="px-4 py-3 font-semibold">Response</th>
                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data?.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors text-xs">
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {log.id.slice(0, 10)}...
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {log.order?.orderNumber ?? "N/A (Dev Test)"}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] max-w-xs truncate">
                            {log.request ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] max-w-xs truncate">
                            {log.response ?? log.errorMessage ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                log.success === true
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                  : "bg-red-500/10 text-red-700 border-red-200"
                              }
                            >
                              {log.success ? "Success" : "Failed"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
