import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import AdminHeader from '../../components/AdminHeader';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authenticatedFetch, getUserId } from '../../utils/api';
import { useFocusEffect } from '@react-navigation/native';

interface Contact {
  createdAt: string;  // Changed to string format
}

interface Card {
  createdAt: string;  // Changed to string format
}

interface MonthCounts {
  cards: number;
  contacts: number;
}

export default function AdminDashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [weeklyData, setWeeklyData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
    }]
  });
  const [cardsWeeklyData, setCardsWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);

  const countByMonth = (dates: string[]) => {
    type MonthCounts = {
      [key: string]: number;
    };
    
    const counts: MonthCounts = {
      'Dec': 0,
      'Jan': 0,
      'Feb': 0,
      'Mar': 0,
      'Apr': 0
    };

    dates.forEach(dateStr => {
      if (!dateStr) {
        console.log('Invalid date string:', dateStr);
        return;
      }

      try {
        // Extract month from date string like "February 25, 2025 at 6:25:00 PM GMT+2"
        const monthFull = dateStr.split(' ')[0];
        const monthShort = monthFull.slice(0, 3) as keyof MonthCounts;
        if (monthShort in counts) {
          counts[monthShort]++;
        }
      } catch (error) {
        console.error('Error processing date string:', dateStr, error);
      }
    });

    return counts;
  };

  const fetchData = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const [contactsResponse, cardsResponse] = await Promise.all([
        authenticatedFetch(`/contacts/${userId}`),
        authenticatedFetch(`/cards/${userId}`)
      ]);

      const contactsData = await contactsResponse.json();
      const cardsData = await cardsResponse.json();

      // Extract dates and ensure they're in the correct string format
      const contactDates = contactsData?.contactList
        ?.map((contact: Contact) => contact?.createdAt)
        ?.filter(Boolean) || [];
      
      const cardDates = cardsData
        ?.map((card: Card) => card?.createdAt)
        ?.filter(Boolean) || [];

      console.log('Contact Dates Sample:', contactDates[0]);
      console.log('Card Dates Sample:', cardDates[0]);

      // Count items by month
      const cardCounts = countByMonth(cardDates);
      const contactCounts = countByMonth(contactDates);

      // Create chart data
      const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
      setWeeklyData({
        labels: months,
        datasets: [
          {
            data: months.map(month => cardCounts[month as keyof MonthCounts]),
            color: () => '#FF526D'
          },
          {
            data: months.map(month => contactCounts[month]),
            color: () => '#1B2559'
          }
        ]
      });

      // Update totals
      setTotalContacts(contactsData?.contactList?.length || 0);
      setTotalCards(cardsData?.length || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, [])
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Dashboard" />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        
        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.cardNumber}>{totalCards}</Text>
            <Text style={styles.cardLabel}>Total Cards</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" style={styles.cardIcon} />
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: '#1B2559' }]}>
            <Text style={styles.cardNumber}>{totalContacts}</Text>
            <Text style={styles.cardLabel}>Total Contacts</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" style={styles.cardIcon} />
          </View>
        </View>

        {/* Weekly Growth Section */}
        <View style={styles.growthSection}>
          <View style={styles.growthHeader}>
            <Text style={styles.sectionTitle}>Weekly Growth</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="black" />
          </View>
          
          <LineChart
            data={weeklyData}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisInterval={1} // Force 1 unit intervals
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(27, 37, 89, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#fff'
              },
              useShadowColorFromDataset: true,
              count: 5,
              formatYLabel: (value) => Math.floor(Number(value)).toString() // Ensure integer labels
            }}
            fromZero={true}
            segments={4}
            bezier
            style={styles.chart}
          />
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF526D' }]} />
              <Text style={styles.legendText}>Total Cards</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1B2559' }]} />
              <Text style={styles.legendText}>Total Contacts</Text>
            </View>
          </View>
        </View>

        {/* Bottom Stats - Commented out
        <View style={styles.bottomStats}>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Average Card Views</Text>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>125</Text>
              <Text style={styles.statLabel}>Views</Text>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>↑ 34%</Text>
              </View>
            </View>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Contact Growth</Text>
            <View style={styles.statContent}>
              <Text style={styles.growthValue}>+45</Text>
              <Text style={styles.growthLabel}>Today</Text>
              <View style={[styles.percentageBadge, styles.pinkBadge]}>
                <Text style={styles.percentageText}>↑ 12%</Text>
              </View>
            </View>
          </View>
        </View>
        */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 100,
  },
  scrollContent: {
    paddingBottom: Platform.select({
      ios: 10,
      android: 10,
    }),
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  overviewCard: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
  },
  cardNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  cardLabel: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  cardIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  growthSection: {
    marginBottom: 30,
  },
  growthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    color: '#666',
  },
  bottomStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.select({
      ios: 10,
      android: 20,
    }),
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
  },
  statTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  statContent: {
    flexDirection: 'column',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  growthValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  growthLabel: {
    fontSize: 16,
    color: '#666',
  },
  percentageBadge: {
    backgroundColor: '#1B2559',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  pinkBadge: {
    backgroundColor: '#FF526D',
  },
  percentageText: {
    color: 'white',
    fontSize: 12,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});