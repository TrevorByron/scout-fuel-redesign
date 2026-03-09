"use client"

import * as React from "react"
import {
  budgetVsActual,
  forecastData,
} from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { LineChart, Line } from "recharts"

const barChartConfig = {
  budget: { label: "Budget", color: "var(--chart-1)" },
  actual: { label: "Actual", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function BudgetPage() {
  const [fuelPrice, setFuelPrice] = React.useState("3.85")
  const [mileage, setMileage] = React.useState("120000")
  const [efficiency, setEfficiency] = React.useState("6.8")
  const projectedSpend =
    (Number(mileage) / Number(efficiency)) * Number(fuelPrice) * 0.95

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Budget & Forecasting</h2>
        <p className="text-sm text-muted-foreground">
          Budget vs actual and forecast models
        </p>
      </div>

      <Tabs defaultValue="month" className="px-4 lg:px-6">
        <TabsList>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                  <BarChart data={budgetVsActual} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="var(--chart-1)" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="var(--chart-2)" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="quarter" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual (Quarter)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                  <BarChart data={budgetVsActual.slice(-3)} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="budget" fill="var(--chart-1)" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="var(--chart-2)" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="year" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual (Year)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                  <BarChart data={budgetVsActual} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="budget" fill="var(--chart-1)" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="var(--chart-2)" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Forecast model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Predicted next month spend:</span>{" "}
                ${forecastData.predictedNextMonth.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: ${forecastData.confidenceLow.toLocaleString()} – $
                {forecastData.confidenceHigh.toLocaleString()}
              </p>
              <p className="text-sm font-medium mt-2">Key factors:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {forecastData.factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical trends</CardTitle>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{ actual: { label: "Actual", color: "var(--chart-2)" } }} className="h-[160px] w-full">
                <LineChart data={budgetVsActual}>
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="actual" stroke="var(--chart-2)" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Scenario analysis</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Fuel price ($/gal)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly mileage</Label>
                  <Input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fleet avg MPG</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={efficiency}
                    onChange={(e) => setEfficiency(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-4 text-sm">
                <span className="text-muted-foreground">Projected spend:</span>{" "}
                <span className="font-medium">${Math.round(projectedSpend).toLocaleString()}</span>
              </p>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
