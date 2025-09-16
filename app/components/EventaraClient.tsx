'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  City,
  Category,
  Event,
  Language,
  User,
  AuthMode,
  AIAutofillData,
  Review,
} from '@/lib/types';
import { api } from '@/lib/api';
import { Header } from './Header';
import { FeaturedCarousel } from './FeaturedCarousel';
import { DiscoveryBar } from './DiscoveryBar';
import { EventGrid } from './EventGrid';
import { SearchBar } from './SearchBar';
import { EventDetailModal } from './EventDetailModal';
import { CreateEventModal } from './CreateEventModal';
import { AuthModal } from './AuthModal';
import { AIAssistantModal } from './AIAssistantModal';
import { EmailVerificationNotice } from './EmailVerificationNotice';
import { UserProfileModal } from './UserProfileModal';
import { Pagination } from './Pagination';
import { loggingService } from '@/lib/loggingService';

const EVENTS_PER_PAGE = 8;

interface EventaraClientProps {
  initialEvents: Event[];
  initialCities: City[];
  initialCategories: Category[];
}

const EventaraClient: React.FC<EventaraClientProps> = ({ initialEvents, initialCities, initialCategories }) => {
  // Data state
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [cities] = useState<City[]>(initialCities);
  const [categories] = useState<Category[]>(initialCategories);
  
  // UI State
  const [lang, setLang] = useState<Language>('en');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isAIAssistantOpen, setAIAssistantOpen] = useState(false);
  const [aiAutofill, setAiAutofill] = useState<AIAutofillData | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Filtering and Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    query: '',
    month: '',
    category: null as string | null,
    city: null as string | null,
  });
  
  const handleFilterChange = useCallback((type: string, value: string) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [type]: value }));
  }, []);
  
  const handleDiscoveryFilter = (type: 'city' | 'category', id: string) => {
      setCurrentPage(1);
      setFilters(prev => {
          const current = prev[type];
          return { ...prev, [type]: current === id ? null : id };
      });
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr';
  }, [lang]);
  
  const handleAuthClick = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };
  
  const handleLogin = async (provider: 'email' | 'google' | 'facebook', data?: any) => {
    try {
        if (provider === 'email') {
            const result = await api.login(data.email, data.password);
            if ('error' in result && result.error === 'unverified') {
                setUnverifiedEmail(result.email);
                setAuthModalOpen(false);
            } else {
                setCurrentUser(result as User);
                setAuthModalOpen(false);
            }
        } else {
            // Mock social logins
            const mockUser = await api.login('salar@example.com', 'password123');
            if (!('error' in mockUser)) setCurrentUser(mockUser as User);
            setAuthModalOpen(false);
        }
    } catch (error) {
       loggingService.logError(error as Error, { context: 'handleLogin' });
       throw error;
    }
  };

  const handleSignUp = async (data: any) => {
    try {
        const newUser = await api.signup(data);
        setUnverifiedEmail(newUser.email);
        setAuthModalOpen(false);
    } catch (error) {
       loggingService.logError(error as Error, { context: 'handleSignUp' });
       throw error;
    }
  };
  
  const handleForgotPassword = async (email: string) => {
    try {
        await api.forgotPassword(email);
    } catch (error) {
        loggingService.logError(error as Error, { context: 'handleForgotPassword' });
        throw error;
    }
  };

  const handleSimulateVerification = async (email: string) => {
      const verifiedUser = await api.verifyUser(email);
      setCurrentUser(verifiedUser);
      setUnverifiedEmail(null);
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    loggingService.trackEvent('logout');
  };

  const handleOpenCreateModal = (eventToEditParam?: Event) => {
      if (eventToEditParam) {
          setEventToEdit(eventToEditParam);
      } else {
          setEventToEdit(null);
          setAiAutofill(null);
      }
      setCreateModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<Event, 'id' | 'reviews' | 'organizerId'>) => {
    if (!currentUser) return;
    try {
        let savedEvent;
        if (eventToEdit) {
            savedEvent = await api.updateEvent(eventToEdit.id, eventData);
            setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e));
        } else {
            savedEvent = await api.addEvent(eventData, currentUser.id);
            setEvents([savedEvent, ...events]);
        }
        setCreateModalOpen(false);
        setEventToEdit(null);
        setAiAutofill(null);
        setSelectedEvent(savedEvent); // Open detail view of new/edited event
    } catch (error) {
        loggingService.logError(error as Error, { context: 'handleSaveEvent' });
    }
  };
  
  const handleAddReview = async (eventId: string, reviewData: Omit<Review, 'id'| 'user' | 'timestamp'>) => {
    if (!currentUser) return;
    try {
        const updatedEvent = await api.addReview(eventId, reviewData, currentUser.id);
        setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent(updatedEvent);
        }
    } catch (error) {
       loggingService.logError(error as Error, { context: 'handleAddReview' });
    }
  };
  
  const handleApplyAI = (data: AIAutofillData) => {
    setAiAutofill(data);
    setAIAssistantOpen(false);
    setCreateModalOpen(true);
  };

  const handleViewProfile = async (userId: string) => {
      const user = await api.getUserById(userId);
      if (user) {
          setSelectedEvent(null); // Close event detail modal if open
          setProfileUser(user);
      }
  };

  const filteredEvents = events.filter(event => {
    const query = filters.query.toLowerCase();
    const matchesQuery = query === '' ||
      event.title.en.toLowerCase().includes(query) ||
      event.title.ar.toLowerCase().includes(query) ||
      (event.title.ku && event.title.ku.toLowerCase().includes(query)) ||
      event.description.en.toLowerCase().includes(query) ||
      event.description.ar.toLowerCase().includes(query) ||
      (event.description.ku && event.description.ku.toLowerCase().includes(query));

    const matchesMonth = filters.month === '' || new Date(event.date).getMonth() === parseInt(filters.month, 10);
    const matchesCategory = !filters.category || event.categoryId === filters.category;
    const matchesCity = !filters.city || event.cityId === filters.city;

    return matchesQuery && matchesMonth && matchesCategory && matchesCity;
  });

  const featuredEvents = events.filter(e => e.isFeatured);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const indexOfLastEvent = currentPage * EVENTS_PER_PAGE;
  const indexOfFirstEvent = indexOfLastEvent - EVENTS_PER_PAGE;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);

  if (unverifiedEmail) {
      return <EmailVerificationNotice 
        email={unverifiedEmail} 
        onSimulateVerification={handleSimulateVerification}
        onBackToLogin={() => setUnverifiedEmail(null)}
      />;
  }

  return (
    <div className="bg-neutral text-neutral-text font-sans" dir={lang === 'ar' || lang === 'ku' ? 'rtl' : 'ltr'}>
      <Header
        lang={lang}
        onLangChange={setLang}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenAIAssistant={() => setAIAssistantOpen(true)}
        currentUser={currentUser}
        onAuthClick={handleAuthClick}
        onLogout={handleLogout}
      />
      
      <main>
        {profileUser ? (
             <UserProfileModal
                user={profileUser}
                events={events}
                onClose={() => setProfileUser(null)}
                onSelectEvent={setSelectedEvent}
                lang={lang}
            />
        ) : (
            <>
                <FeaturedCarousel events={featuredEvents} lang={lang} onSelectEvent={setSelectedEvent} />
                <DiscoveryBar
                  cities={cities}
                  categories={categories}
                  onFilterChange={handleDiscoveryFilter}
                  activeFilters={{ city: filters.city, category: filters.category }}
                  lang={lang}
                />
                <SearchBar
                    cities={cities}
                    categories={categories}
                    lang={lang}
                    onFilterChange={handleFilterChange}
                    currentFilters={filters}
                />
                <EventGrid
                  events={currentEvents}
                  lang={lang}
                  onSelectEvent={setSelectedEvent}
                  title={lang === 'en' ? 'Upcoming Events' : lang === 'ku' ? 'ڕووداوە چاوەڕوانکراوەکان' : 'الفعاليات القادمة'}
                />
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </>
        )}
      </main>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          lang={lang}
          onAddReview={handleAddReview}
          currentUser={currentUser}
          onEdit={() => { 
            const eventToEditCopy = {...selectedEvent};
            setSelectedEvent(null); 
            handleOpenCreateModal(eventToEditCopy); 
          }}
          onViewProfile={handleViewProfile}
        />
      )}

      {isCreateModalOpen && (
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => { setCreateModalOpen(false); setEventToEdit(null); setAiAutofill(null); }}
          onSave={handleSaveEvent}
          cities={cities}
          categories={categories}
          lang={lang}
          eventToEdit={eventToEdit}
          aiAutofillData={aiAutofill}
          currentUser={currentUser}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          initialMode={authMode}
          onForgotPassword={handleForgotPassword}
          lang={lang}
        />
      )}

      {isAIAssistantOpen && (
          <AIAssistantModal
            isOpen={isAIAssistantOpen}
            onClose={() => setAIAssistantOpen(false)}
            onApply={handleApplyAI}
            cities={cities}
            categories={categories}
          />
      )}
    </div>
  );
};

export default EventaraClient;
