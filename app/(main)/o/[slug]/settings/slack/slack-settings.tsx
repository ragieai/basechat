"use client";

import { Loader2, ExternalLink, CheckCircle, AlertCircle, Hash, Users, Lock, Plus, X, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as schema from "@/lib/server/db/schema";

type Props = {
  tenant: typeof schema.tenants.$inferSelect;
  slackConfigured: boolean;
};

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
}

export default function SlackSettings({ tenant, slackConfigured }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [joiningChannels, setJoiningChannels] = useState<Set<string>>(new Set());
  const [responseMode, setResponseMode] = useState<"mentions" | "all">(tenant.slackResponseMode || "mentions");
  const [updatingResponseMode, setUpdatingResponseMode] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback success/error messages
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success("Successfully connected to Slack!");
    } else if (error) {
      let errorMessage = "Failed to connect to Slack";
      switch (error) {
        case "oauth_not_configured":
          errorMessage = "Slack OAuth is not configured on the server";
          break;
        case "missing_code_or_state":
          errorMessage = "Invalid authorization response from Slack";
          break;
        case "callback_failed":
          errorMessage = "Failed to complete Slack authorization";
          break;
        default:
          errorMessage = `Slack authorization failed: ${error}`;
      }
      toast.error(errorMessage);
    }
  }, [searchParams]);

  const isConnected = tenant.slackEnabled && tenant.slackBotToken;

  async function fetchChannels() {
    if (!isConnected) return;

    setLoadingChannels(true);
    try {
      const response = await fetch(`/api/slack/channels?tenant=${tenant.slug}`);
      if (!response.ok) throw new Error("Failed to fetch channels");

      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      toast.error("Failed to fetch Slack channels");
      console.error("Error fetching channels:", error);
    } finally {
      setLoadingChannels(false);
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchChannels();
    }
  }, [isConnected]);

  async function handleChannelAction(channelId: string, action: "join" | "leave") {
    setJoiningChannels((prev) => new Set(prev).add(channelId));

    try {
      const response = await fetch(`/api/slack/channels/join?tenant=${tenant.slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} channel`);

      toast.success(`Successfully ${action === "join" ? "joined" : "left"} channel`);

      // Refresh channels and tenant data
      await fetchChannels();
      window.location.reload(); // Simple way to refresh tenant data
    } catch (error) {
      toast.error(`Failed to ${action} channel`);
      console.error(`Error ${action}ing channel:`, error);
    } finally {
      setJoiningChannels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  }

  async function handleConnectSlack() {
    window.location.href = `/api/slack/oauth?tenant=${tenant.slug}`;
  }

  async function handleDisconnectSlack() {
    setLoading(true);
    try {
      const response = await fetch("/api/tenants/current", {
        method: "PATCH",
        headers: {
          tenant: tenant.slug,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slackEnabled: false,
          slackBotToken: null,
          slackTeamId: null,
          slackTeamName: null,
          slackChannels: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      toast.success("Disconnected from Slack");
      window.location.reload(); // Simple way to refresh the state
    } catch (error) {
      toast.error("Failed to disconnect from Slack");
    } finally {
      setLoading(false);
    }
  }

  async function handleResponseModeChange(newMode: "mentions" | "all") {
    setUpdatingResponseMode(true);
    try {
      const response = await fetch("/api/tenants/current", {
        method: "PATCH",
        headers: {
          tenant: tenant.slug,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slackResponseMode: newMode,
        }),
      });

      if (!response.ok) throw new Error("Failed to update response mode");

      setResponseMode(newMode);
      toast.success(`Response mode updated to ${newMode === "mentions" ? "mentions only" : "all messages"}`);
    } catch (error) {
      toast.error("Failed to update response mode");
    } finally {
      setUpdatingResponseMode(false);
    }
  }

  const configuredChannels = tenant.slackChannels || [];
  const joinedChannels = channels.filter((channel) => channel.isMember);
  const availableChannels = channels.filter((channel) => !channel.isMember);

  return (
    <div className="w-full p-4 flex-grow flex flex-col relative">
      <div className="flex w-full justify-between items-center mb-16">
        <h1 className="font-bold text-[32px] text-[#343A40]">Slack Integration</h1>
      </div>

      <div className="space-y-8 max-w-4xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#343A40]">Connect your Slack workspace</h2>
          <p className="text-sm text-muted-foreground">
            Add our AI assistant to your Slack workspace to enable chat interactions and notifications directly in
            Slack.
          </p>
        </div>

        {!slackConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">Slack OAuth Not Configured</h3>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              The administrator needs to configure Slack OAuth credentials (SLACK_CLIENT_ID and SLACK_CLIENT_SECRET) to
              enable Slack integration.
            </p>
          </div>
        ) : isConnected ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Connected to Slack</h3>
              </div>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Workspace: <strong>{tenant.slackTeamName || "Unknown"}</strong>
                </p>
                <p>Your AI assistant is ready to use in Slack!</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-[#343A40]">Integration Status</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bot Status:</span>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Workspace:</span>
                  <span className="text-sm font-medium">{tenant.slackTeamName || "Unknown"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Channels Joined:</span>
                  <span className="text-sm font-medium">{joinedChannels.length}</span>
                </div>
              </div>
            </div>

            {/* Response Mode Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#343A40]" />
                <h3 className="font-medium text-[#343A40]">Response Behavior</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose when the AI assistant should respond in Slack channels.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <RadioGroup
                  value={responseMode}
                  onValueChange={(value: "mentions" | "all") => handleResponseModeChange(value)}
                  disabled={updatingResponseMode}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="mentions" id="mentions" />
                    <Label htmlFor="mentions" className="flex-1 cursor-pointer">
                      <div className="font-medium">App mentions only</div>
                      <div className="text-sm text-muted-foreground">
                        Respond only when someone @mentions the bot or sends a direct message
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex-1 cursor-pointer">
                      <div className="font-medium">All messages</div>
                      <div className="text-sm text-muted-foreground">
                        Respond to every message in joined channels (may be very active)
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                {updatingResponseMode && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating response behavior...
                  </div>
                )}
              </div>
            </div>

            {/* Channel Configuration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#343A40]">Channel Configuration</h3>
                <Button variant="outline" size="sm" onClick={fetchChannels} disabled={loadingChannels}>
                  {loadingChannels ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                  Refresh Channels
                </Button>
              </div>

              {/* Joined Channels */}
              {joinedChannels.length > 0 && (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Joined Channels ({joinedChannels.length})
                    </h3>
                    <p className="text-sm text-muted-foreground">Channels where the AI assistant is currently active</p>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      {joinedChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {channel.isPrivate ? (
                              <Lock className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Hash className="h-4 w-4 text-gray-500" />
                            )}
                            <div>
                              <div className="font-medium">#{channel.name}</div>
                              {channel.memberCount && (
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {channel.memberCount} members
                                </div>
                              )}
                            </div>
                            {channel.isPrivate && (
                              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                Private
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChannelAction(channel.id, "leave")}
                            disabled={joiningChannels.has(channel.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {joiningChannels.has(channel.id) ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <X size={16} className="mr-2" />
                            )}
                            Leave
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Available Channels */}
              {availableChannels.length > 0 && (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      Available Channels ({availableChannels.length})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Channels you can join to enable AI assistant interactions
                    </p>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {channel.isPrivate ? (
                              <Lock className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Hash className="h-4 w-4 text-gray-500" />
                            )}
                            <div>
                              <div className="font-medium">#{channel.name}</div>
                              {channel.memberCount && (
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {channel.memberCount} members
                                </div>
                              )}
                            </div>
                            {channel.isPrivate && (
                              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                Private
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChannelAction(channel.id, "join")}
                            disabled={joiningChannels.has(channel.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {joiningChannels.has(channel.id) ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <Plus size={16} className="mr-2" />
                            )}
                            Join
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {loadingChannels && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading channels...</span>
                </div>
              )}

              {!loadingChannels && channels.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  <Hash className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No channels found. Make sure the bot has the necessary permissions.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleDisconnectSlack}
                disabled={isLoading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
                Disconnect from Slack
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Getting Started</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Click &quot;Connect to Slack&quot; below</li>
                <li>2. Choose your Slack workspace</li>
                <li>3. Authorize the AI assistant bot</li>
                <li>4. Configure which channels the bot should join</li>
                <li>5. Start chatting with the bot in any configured channel!</li>
              </ol>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleConnectSlack}
                disabled={isLoading}
                className="bg-[#4A154B] hover:bg-[#4A154B]/90 text-white"
              >
                {isLoading ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <ExternalLink size={16} className="mr-2" />
                )}
                Connect to Slack
              </Button>
            </div>
          </div>
        )}

        {slackConfigured && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-medium text-[#343A40] mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              After connecting and configuring channels, you can interact with the AI assistant by mentioning it in any
              joined channel, or by sending direct messages to the bot.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
