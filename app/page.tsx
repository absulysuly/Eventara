import { api } from "@/lib/api";
import EventaraClient from "./components/EventaraClient";
import ErrorBoundary from "./components/ErrorBoundary";

export default async function HomePage() {
  // Fetch initial data on the server
  const [eventsData, citiesData, categoriesData] = await Promise.all([
    api.getEvents(),
    api.getCities(),
    api.getCategories(),
  ]);

  return (
    <ErrorBoundary>
      <EventaraClient
        initialEvents={eventsData}
        initialCities={citiesData}
        initialCategories={categoriesData}
      />
    </ErrorBoundary>
  );
}
