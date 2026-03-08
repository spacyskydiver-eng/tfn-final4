"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BundleColumn = {
  id: string;
  name: string;
  price: number;
  maxPurchase: number;
  icon: string;
};

type BundleItem = {
  id: string;
  label: string;
  icon: string;
  values: Record<string, number>;
};

type BundleState = {
  columns: BundleColumn[];
  items: BundleItem[];
};

type IconOption = { id: string; label: string; src: string };

const STORAGE_KEY = "bundles-state-v1";

function makeIcon(fill: string, letter?: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'><rect rx='10' ry='10' x='4' y='4' width='56' height='56' fill='${fill}'/><text x='32' y='38' font-family='Inter,Arial' font-size='22' text-anchor='middle' fill='white' font-weight='700'>${letter ?? ""}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const iconOptions: IconOption[] = [
  { id: "stone_chest", label: "Stone Chest", src: makeIcon("#8ba1bd", "S") },
  { id: "iron_chest", label: "Iron Chest", src: makeIcon("#6c747e", "I") },
  { id: "bronze_chest", label: "Bronze Chest", src: makeIcon("#3c8c7b", "B") },
  { id: "silver_chest", label: "Silver Chest", src: makeIcon("#bcc6d6", "Si") },
  { id: "gold_chest", label: "Gold Chest", src: makeIcon("#d8a428", "G") },
  { id: "gem_red", label: "Red Gem", src: makeIcon("#c0392b", "R") },
  { id: "gem_blue", label: "Blue Gem", src: makeIcon("#3498db", "B") },
  { id: "speedup", label: "Speedup", src: makeIcon("#9b59b6", "≫") },
  { id: "resources", label: "Resources", src: makeIcon("#27ae60", "Rs") },
  { id: "gold", label: "Gold", src: makeIcon("#f1c40f", "Au") },
  { id: "keys", label: "Keys", src: makeIcon("#f39c12", "K") },
  { id: "vip", label: "VIP", src: makeIcon("#e67e22", "V") },
];

const defaultState: BundleState = {
  columns: [
    { id: "stone", name: "Stone Chest", price: 5, maxPurchase: 1, icon: iconOptions[0].src },
    { id: "iron", name: "Iron Chest", price: 10, maxPurchase: 1, icon: iconOptions[1].src },
    { id: "bronze", name: "Bronze Chest", price: 20, maxPurchase: 1, icon: iconOptions[2].src },
    { id: "silver", name: "Silver Chest", price: 50, maxPurchase: 1, icon: iconOptions[3].src },
    { id: "gold", name: "Gold Chest", price: 100, maxPurchase: 1, icon: iconOptions[4].src },
  ],
  items: [
    {
      id: "gems_red",
      label: "Gems",
      icon: iconOptions[5].src,
      values: { stone: 1050, iron: 2200, bronze: 4600, silver: 12000, gold: 25000 },
    },
    {
      id: "gems_blue",
      label: "Blue Gems",
      icon: iconOptions[6].src,
      values: { stone: 250000, iron: 500000, bronze: 800000, silver: 2500000, gold: 5000000 },
    },
    {
      id: "speed_days",
      label: "Speedups (minutes)",
      icon: iconOptions[7].src,
      values: { stone: 230, iron: 750, bronze: 960, silver: 2460, gold: 4080 },
    },
    {
      id: "resources_food",
      label: "Food",
      icon: iconOptions[8].src,
      values: { stone: 250000, iron: 5000000, bronze: 2250000, silver: 6000000, gold: 20000000 },
    },
    {
      id: "resources_wood",
      label: "Wood",
      icon: iconOptions[8].src,
      values: { stone: 250000, iron: 5000000, bronze: 2250000, silver: 6000000, gold: 20000000 },
    },
    {
      id: "resources_stone",
      label: "Stone",
      icon: iconOptions[8].src,
      values: { stone: 187500, iron: 3750000, bronze: 1687500, silver: 4500000, gold: 15000000 },
    },
    {
      id: "resources_gold",
      label: "Gold",
      icon: iconOptions[9].src,
      values: { stone: 0, iron: 2000000, bronze: 600000, silver: 2000000, gold: 8000000 },
    },
    {
      id: "vip",
      label: "VIP",
      icon: iconOptions[10].src,
      values: { stone: 1025, iron: 1000, bronze: 2000, silver: 1100, gold: 6000 },
    },
  ],
};

function IconPicker({ value, onChange }: { value: string; onChange: (src: string) => void }) {
  const [customUrl, setCustomUrl] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 overflow-hidden rounded-md border border-border bg-secondary">
          {value ? (
            <Image src={value} alt="icon" width={40} height={40} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
        <label className="text-xs text-muted-foreground">Icon</label>
      </div>
      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto rounded-md border border-border p-2 bg-secondary/30">
        {iconOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.src)}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-transparent bg-background/60 p-1 text-[11px] font-medium transition hover:border-primary/50 hover:text-primary",
              value === opt.src && "border-primary text-primary"
            )}
          >
            <Image src={opt.src} alt={opt.label} width={32} height={32} className="h-8 w-8" />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Custom image URL"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          className="h-9"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (customUrl.trim()) {
              onChange(customUrl.trim());
              setCustomUrl("");
            }
          }}
        >
          Use URL
        </Button>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground">
          Upload
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}

export function BundlesContent() {
  const [state, setState] = useState<BundleState>(defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BundleState;
        setState(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    state.items.forEach((item) => {
      for (const col of state.columns) {
        const v = item.values[col.id] ?? 0;
        result[item.id] = (result[item.id] || 0) + v;
      }
    });
    return result;
  }, [state.items, state.columns]);

  function updateColumn(id: string, patch: Partial<BundleColumn>) {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function updateItem(id: string, patch: Partial<BundleItem>) {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function updateCell(itemId: string, colId: string, value: number) {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((r) =>
        r.id === itemId ? { ...r, values: { ...r.values, [colId]: value } } : r
      ),
    }));
  }

  function addColumn() {
    const nextIndex = state.columns.length + 1;
    const icon = iconOptions[nextIndex % iconOptions.length]?.src ?? iconOptions[0].src;
    const id = `col_${nextIndex}`;
    setState((prev) => ({
      ...prev,
      columns: [...prev.columns, { id, name: `Bundle ${nextIndex}`, price: 0, maxPurchase: 1, icon }],
      items: prev.items.map((item) => ({
        ...item,
        values: { ...item.values, [id]: 0 },
      })),
    }));
  }

  function addRow() {
    const id = `item_${Date.now()}`;
    const newValues: Record<string, number> = {};
    state.columns.forEach((c) => (newValues[c.id] = 0));
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id,
          label: "New Item",
          icon: iconOptions[0].src,
          values: newValues,
        },
      ],
    }));
  }

  function resetState() {
    setState(defaultState);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bundles</CardTitle>
            <p className="text-sm text-muted-foreground">Customize bundle values, icons, and totals. Data is saved locally for signed and unsigned users.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addColumn}>Add Column</Button>
            <Button variant="outline" size="sm" onClick={addRow}>Add Row</Button>
            <Button variant="outline" size="sm" onClick={resetState}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="w-56 px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">Item</th>
                  {state.columns.map((col) => (
                    <th key={col.id} className="min-w-[140px] px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 overflow-hidden rounded-md border border-border bg-secondary">
                          <Image src={col.icon} alt={col.name} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1">
                          <Input
                            value={col.name}
                            onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <IconPicker value={col.icon} onChange={(src) => updateColumn(col.id, { icon: src })} />
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="min-w-[140px] px-4 py-3 text-right text-xs uppercase tracking-wide text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60 bg-background">
                  <td className="px-4 py-3 text-left font-semibold">Price ($)</td>
                  {state.columns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      <Input
                        type="number"
                        value={col.price}
                        onChange={(e) => updateColumn(col.id, { price: Number(e.target.value) || 0 })}
                        className="h-9 text-right"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold">${state.columns.reduce((s, c) => s + (c.price || 0), 0)}</td>
                </tr>
                <tr className="border-t border-border/60 bg-background">
                  <td className="px-4 py-3 text-left font-semibold">Max Purchase</td>
                  {state.columns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      <Input
                        type="number"
                        value={col.maxPurchase}
                        onChange={(e) => updateColumn(col.id, { maxPurchase: Number(e.target.value) || 0 })}
                        className="h-9 text-right"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold">{state.columns.reduce((s, c) => s + (c.maxPurchase || 0), 0)}</td>
                </tr>

                {state.items.map((item, idx) => (
                  <tr key={item.id} className={cn("border-t border-border/60", idx % 2 === 0 ? "bg-secondary/20" : "bg-background") }>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-md border border-border bg-secondary">
                          <Image src={item.icon} alt={item.label} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-2 w-full">
                          <Input
                            value={item.label}
                            onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            className="h-9"
                          />
                          <IconPicker value={item.icon} onChange={(src) => updateItem(item.id, { icon: src })} />
                        </div>
                      </div>
                    </td>
                    {state.columns.map((col) => (
                      <td key={`${item.id}-${col.id}`} className="px-4 py-4 align-top">
                        <Input
                          type="number"
                          value={item.values[col.id] ?? 0}
                          onChange={(e) => updateCell(item.id, col.id, Number(e.target.value) || 0)}
                          className="h-9 text-right"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right font-semibold">{totals[item.id] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
