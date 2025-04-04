"use client";

import {
  Card,
  Metric,
  Text,
  Title,
  Flex,
  Grid,
  DateRangePicker,
  DateRangePickerValue,
  LineChart,
  DateRangePickerItem,
  Callout,
} from "@tremor/react";
import { formatDataWithEmptyDateTime } from "@/utils/metrics/metrics";
import { DateTime } from "luxon";
import { useState, useEffect } from "react";
import ShopstrSpinner from "@/components/utility-components/shopstr-spinner";

type Data = {
  label: string;
  category: Category;
};

type Category = {
  title: string;
  subtitle: string;
  total: number;
  symbol: string;
  metrics: Metrics[];
};

type Metrics = {
  period: string;
} & {
  [label: string]: number;
};

export default function MetricsPage() {
  const [date, setDate] = useState<DateRangePickerValue>({
    from: DateTime.now().minus({ days: 7 }).toJSDate(),
    to: DateTime.now().toJSDate(),
  });
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startDate = DateTime.fromJSDate(date.from!).toISO();
    const endDate = DateTime.fromJSDate(date.to!).toISO();

    if (!startDate || !endDate) return;

    setLoading(true);
    fetch(`/api/metrics/get-metrics?startDate=${startDate}&endDate=${endDate}`)
      .then((res) => res.json())
      .then((data: Data[]) => {
        const formattedData = data.map((data) => {
          const formattedMetrics =
            formatDataWithEmptyDateTime(
              data.category.metrics,
              data.label,
              startDate,
              endDate,
            ) || [];
          return {
            label: data.label,
            category: {
              ...data.category,
              metrics: formattedMetrics,
            },
          };
        });
        setData(formattedData);
        setLoading(false);
      });
  }, [date]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-light-bg pt-24 dark:bg-dark-bg">
      <div className="p-4">
        <Callout title="Work In Progress - Analytics" color="purple">
          This is a global metrics page for all of Shopstr. We are working on a
          personalized metrics page for every Shopstr merchant!
        </Callout>
        <DateRangePicker
          className="my-5"
          value={date}
          onValueChange={setDate}
          color="rose"
          suppressHydrationWarning
        >
          <DateRangePickerItem
            key="today"
            value="today"
            from={DateTime.now().startOf("day").toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Today
          </DateRangePickerItem>
          <DateRangePickerItem
            key="sevenDays"
            value="sevenDays"
            from={DateTime.now().minus({ days: 7 }).toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Last 7 Days
          </DateRangePickerItem>
          <DateRangePickerItem
            key="thirtyDays"
            value="thirtyDays"
            from={DateTime.now().minus({ days: 30 }).toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Last 30 Days
          </DateRangePickerItem>
          <DateRangePickerItem
            key="threehundredsixtyfiveDays"
            value="threehundredsixtyfiveDays"
            from={DateTime.now().minus({ days: 365 }).toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Last 365 Days
          </DateRangePickerItem>
          <DateRangePickerItem
            key="mtd"
            value="ytd"
            from={DateTime.now().startOf("month").toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Month to Date
          </DateRangePickerItem>
          <DateRangePickerItem
            key="ytd"
            value="ytd"
            from={DateTime.now().startOf("year").toJSDate()}
            to={DateTime.now().toJSDate()}
          >
            Year to Date
          </DateRangePickerItem>
        </DateRangePicker>
        {loading ? (
          <div className="mt-8 flex items-center justify-center">
            <ShopstrSpinner />
          </div>
        ) : (
          <Grid numItemsSm={1} numItemsMd={2} numItemsLg={3} className="gap-6">
            {data.map((item) => (
              <Card key={item.category.title}>
                <Title>{item.category.title}</Title>
                <Flex
                  justifyContent="start"
                  alignItems="baseline"
                  className="space-x-2"
                >
                  <Metric>
                    {item.category.total} {item.category.symbol}
                  </Metric>
                </Flex>
                <Text>{item.category.subtitle}</Text>
                <LineChart
                  className="mt-4 h-80"
                  data={item.category.metrics}
                  categories={[item.label]}
                  suppressHydrationWarning
                  index="period"
                  colors={["indigo", "fuchsia"]}
                  valueFormatter={
                    (number: number) =>
                      `${number.toString()} ${item.category.symbol}`
                    // `$ ${Intl.NumberFormat('us').format(number).toString()}`
                  }
                  yAxisWidth={60}
                />
              </Card>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
}
