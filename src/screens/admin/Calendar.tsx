import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { COLORS } from '../../constants/colors';
import AdminHeader from '../../components/AdminHeader';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AdminTabParamList } from '../../types';

type CalendarNavigationProp = BottomTabNavigationProp<AdminTabParamList, 'Calendar'>;

type Event = {
  id: string;
  date: string;
  title: string;
  time: string;
};

export default function Calendar() {
  const [selectedYear, setSelectedYear] = useState('2024');
  
  // Example events - replace with your actual events data
  const events: Event[] = [
    { id: '1', date: '2024-01-16', title: 'Conference', time: '9am - 12pm' },
    { id: '2', date: '2024-01-21', title: 'Travel', time: '11am - 5pm' },
    { id: '3', date: '2024-01-26', title: 'Meeting', time: '11am - 5pm' },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader title="Calendar" />
      <View style={styles.content}>
        <View style={styles.yearSelector}>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        <RNCalendar
          style={styles.calendar}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#000000',
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: COLORS.primary,
            dayTextColor: '#2d4150',
            monthTextColor: COLORS.primary,
            textMonthFontSize: 20,
            textMonthFontWeight: 'bold',
          }}
          markedDates={{
            '2024-01-15': { selected: true, selectedColor: COLORS.primary },
            '2024-01-16': { marked: true, dotColor: '#FF69B4' },
            '2024-01-21': { marked: true, dotColor: '#FF69B4' },
            '2024-01-26': { marked: true, dotColor: '#FF69B4' },
          }}
        />

        <View style={styles.eventsSection}>
          <Text style={styles.upcomingTitle}>Upcoming Events</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <Text style={styles.eventDate}>
                  {new Date(event.date).getDate()} {new Date(event.date).toLocaleString('default', { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.createEventButton}>
            <Text style={styles.createEventText}>+ Create Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    marginTop: 120,
    padding: 20,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  yearText: {
    fontSize: 18,
    marginRight: 5,
  },
  dropdownIcon: {
    fontSize: 12,
  },
  calendar: {
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  eventsSection: {
    marginTop: 20,
  },
  upcomingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    minWidth: 150,
  },
  eventDate: {
    color: '#FF69B4',
    fontSize: 12,
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventTime: {
    color: '#666',
    fontSize: 12,
  },
  createEventButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  createEventText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
