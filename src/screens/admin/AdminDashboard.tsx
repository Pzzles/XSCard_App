import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AdminHeader from '../../components/AdminHeader';

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <View style={styles.container}>
      <AdminHeader title="Admin Dashboard" />
      
      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>150</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>89</Text>
            <Text style={styles.statLabel}>Active Cards</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>New Today</Text>
          </View>
        </View>

        {/* Add more admin dashboard content here */}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerTab, selectedTab === 'overview' && styles.selectedTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <MaterialIcons 
            name="dashboard" 
            size={24} 
            color={selectedTab === 'overview' ? COLORS.primary : COLORS.gray} 
          />
          <Text style={[styles.footerText, selectedTab === 'overview' && styles.selectedText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.footerTab, selectedTab === 'users' && styles.selectedTab]}
          onPress={() => setSelectedTab('users')}
        >
          <MaterialIcons 
            name="people" 
            size={24} 
            color={selectedTab === 'users' ? COLORS.primary : COLORS.gray} 
          />
          <Text style={[styles.footerText, selectedTab === 'users' && styles.selectedText]}>
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.footerTab, selectedTab === 'settings' && styles.selectedTab]}
          onPress={() => setSelectedTab('settings')}
        >
          <MaterialIcons 
            name="settings" 
            size={24} 
            color={selectedTab === 'settings' ? COLORS.primary : COLORS.gray} 
          />
          <Text style={[styles.footerText, selectedTab === 'settings' && styles.selectedText]}>
            Settings
          </Text>
        </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerTab: {
    alignItems: 'center',
    padding: 10,
  },
  selectedTab: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  selectedText: {
    color: COLORS.primary,
  },
});