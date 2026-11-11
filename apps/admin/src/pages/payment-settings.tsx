import { useEffect, useState, type FormEvent } from "react";
import { Button, Container, Heading, Input, Label, Select, StatusBadge, Switch, Text, toast } from "@medusajs/ui";
import { Landmark, Save, Server } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { isSuperAdmin } from "../lib/auth-utils";
import { formatAdminDate } from "../lib/orders-client";
import {
  fetchBankhubSettings,
  saveBankhubSettings,
  type BankhubSettingsInput,
  type BankhubSettingsResponse,
} from "../lib/payment-settings-client";

type FormState = {
  enabled: boolean;
  orgTaxNo: string;
  bankCode: string;
  bankAccountNumber: string;
  domainWebsite: string;
};

function toForm(settings: BankhubSettingsResponse["settings"]): FormState {
  return {
    enabled: settings.enabled,
    orgTaxNo: settings.orgTaxNo ?? "",
    bankCode: settings.bankCode ?? "",
    bankAccountNumber: settings.bankAccountNumber ?? "",
    domainWebsite: settings.domainWebsite ?? "",
  };
}

function toInput(form: FormState): BankhubSettingsInput {
  return {
    enabled: form.enabled,
    orgTaxNo: form.orgTaxNo || null,
    bankCode: form.bankCode || null,
    bankAccountNumber: form.bankAccountNumber || null,
    domainWebsite: form.domainWebsite || null,
  };
}

function EnvRow({ label, value }: { label: string; value: string | boolean | null }) {
  const ok = typeof value === "boolean" ? value : Boolean(value);
  return (
    <div className="flex items-center justify-between gap-x-4 py-1.5">
      <Text size="small" className="font-mono text-ui-fg-subtle">
        {label}
      </Text>
      <div className="flex min-w-0 items-center gap-x-2">
        {typeof value === "string" ? (
          <Text size="small" className="truncate text-ui-fg-base">
            {value}
          </Text>
        ) : null}
        <StatusBadge color={ok ? "green" : "red"}>{ok ? "Set" : "Missing"}</StatusBadge>
      </div>
    </div>
  );
}

export function PaymentSettingsPage() {
  const auth = useAuth();
  const allowed = isSuperAdmin(auth.user?.role);
  const [data, setData] = useState<BankhubSettingsResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchBankhubSettings()
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setForm(toForm(response.settings));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load payment settings");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const response = await saveBankhubSettings(toInput(form));
      setData(response);
      setForm(toForm(response.settings));
      toast.success("Payment settings saved");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="uppercase tracking-wider text-ui-fg-muted">
            Payments
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">JETPAY BankHub</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Bank-transfer orders get a VietQR and transfer description from BankHub, and are marked paid
              automatically when JETPAY confirms the incoming transfer.
            </Text>
          </div>
          {data ? (
            <div className="flex flex-wrap gap-2">
              <StatusBadge color={data.configured ? "green" : "orange"}>
                {data.configured ? "Active for new orders" : "Inactive for new orders"}
              </StatusBadge>
              <StatusBadge color={data.webhookReady ? "green" : "red"}>
                {data.webhookReady ? "Webhook ready" : "Webhook key missing"}
              </StatusBadge>
            </div>
          ) : null}
        </div>
      </Container>

      {!allowed ? (
        <Container>
          <Heading level="h3">Restricted</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Only super-admin accounts can view or change payment settings.
          </Text>
        </Container>
      ) : error ? (
        <Container>
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        </Container>
      ) : !data || !form ? (
        <Container>
          <Text size="small" className="text-ui-fg-muted">
            Loading payment settings…
          </Text>
        </Container>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Container>
            <form className="flex flex-col gap-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Landmark className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Receiving account
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Must match the organization and bank account linked on the BankHub portal.
                </Text>
              </div>

              <div className="flex items-center justify-between gap-x-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                <div className="flex flex-col">
                  <Label htmlFor="bankhub-enabled">Use BankHub for new bank-transfer orders</Label>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Turning this off stops new initializations; incoming webhooks are still recorded.
                  </Text>
                </div>
                <Switch
                  id="bankhub-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => set("enabled", checked)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankhub-tax">Organization tax number</Label>
                  <Input
                    id="bankhub-tax"
                    value={form.orgTaxNo}
                    onChange={(e) => set("orgTaxNo", e.target.value)}
                    placeholder="0101234567"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Bank</Label>
                  <Select value={form.bankCode || undefined} onValueChange={(value) => set("bankCode", value)}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select bank code" />
                    </Select.Trigger>
                    <Select.Content>
                      {data.bankCodes.map((code) => (
                        <Select.Item key={code} value={code}>
                          {code}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankhub-account">Bank account number</Label>
                  <Input
                    id="bankhub-account"
                    value={form.bankAccountNumber}
                    onChange={(e) => set("bankAccountNumber", e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankhub-domain">Website domain (optional)</Label>
                  <Input
                    id="bankhub-domain"
                    value={form.domainWebsite}
                    onChange={(e) => set("domainWebsite", e.target.value)}
                    placeholder="ptplatinum.vn"
                  />
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Picks the transfer-syntax rule set on BankHub; empty uses the first website rule.
                  </Text>
                </div>
              </div>

              <div className="flex items-center justify-between gap-x-4">
                <Text size="xsmall" className="text-ui-fg-muted">
                  {data.settings.updatedAt ? `Last saved ${formatAdminDate(data.settings.updatedAt)}` : "Not saved yet"}
                </Text>
                <Button type="submit" size="small" isLoading={saving}>
                  <Save className="h-4 w-4" />
                  Save settings
                </Button>
              </div>
            </form>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Server className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Server environment
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Domains and secrets are read from the backend env and cannot be edited here.
                </Text>
              </div>
              <div className="flex flex-col divide-y divide-ui-border-base">
                <EnvRow label="JETPAY_AUTH_URL" value={data.env.authUrl} />
                <EnvRow label="JETPAY_BANKHUB_URL" value={data.env.bankhubUrl} />
                <EnvRow label="JETPAY_CLIENT_ID" value={data.env.clientIdSet} />
                <EnvRow label="JETPAY_CLIENT_SECRET" value={data.env.clientSecretSet} />
                <EnvRow label="JETPAY_WEBHOOK_KEY" value={data.env.webhookKeySet} />
              </div>
              <Text size="xsmall" className="text-ui-fg-muted">
                Webhook URL to register on BankHub: <span className="font-mono">/api/webhooks/jetpay-bankhub</span> on the
                public API domain.
              </Text>
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}
