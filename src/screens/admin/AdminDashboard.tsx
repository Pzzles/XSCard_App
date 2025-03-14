import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, Platform, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';
import AdminHeader from '../../components/AdminHeader';
import { LineChart } from 'react-native-chart-kit';
import { authenticatedFetch, getUserId } from '../../utils/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Contact {
  createdAt: string;  // Changed to string format
  name: string;
  surname: string;
  email: string;
}

interface Card {
  id?: string;
  createdAt: string;  // Changed to string format
  color?: string;
  name?: string;
}

interface MonthCounts {
  cards: number;
  contacts: number;
}

interface ContactsModalProps {
  visible: boolean;
  onClose: () => void;
  contacts: Contact[];
}

interface CardsModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

type AdminDashboardNavigationProp = StackNavigationProp<AuthStackParamList>;

const ContactsModal = ({ visible, onClose, contacts }: ContactsModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Total Contacts</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList}>
          {contacts.map((contact, index) => (
            <View key={index} style={styles.modalItem}>
              <Text style={styles.modalItemTitle}>{contact.name} {contact.surname}</Text>
              <Text style={styles.modalItemSubtitle}>{contact.email}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const CardsModal = ({ visible, onClose, cards }: CardsModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Total Cards</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList}>
          {cards.map((card, index) => (
            <View 
              key={index} 
              style={styles.modalItem}
            >
              <Text style={styles.modalItemTitle}>{card.name || `Card ${index + 1}`}</Text>
              <Text style={styles.modalItemSubtitle}>{new Date(card.createdAt).toLocaleDateString()}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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
  const [userPlan, setUserPlan] = useState<string>('free');
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [cardsList, setCardsList] = useState<Card[]>([]);
  const [visibleMetrics, setVisibleMetrics] = useState<{cards: boolean; contacts: boolean}>({
    cards: true,
    contacts: true
  });

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

      if (contactsData?.contactList) {
        setContactsList(contactsData.contactList);
      }
      if (cardsData) {
        setCardsList(cardsData);
      }

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

  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { plan } = JSON.parse(userData);
          setUserPlan(plan);
          
          // Redirect if user is on free plan
          if (plan === 'free') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp', params: undefined }],
            });
          }
        }
      } catch (error) {
        console.error('Error checking user plan:', error);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: undefined }],
        });
      }
    };

    checkUserPlan();
  }, [navigation]);

  const toggleMetric = (metric: 'cards' | 'contacts') => {
    if (visibleMetrics.cards && visibleMetrics.contacts) {
      // If both are visible, show only the clicked one
      setVisibleMetrics({
        cards: metric === 'cards',
        contacts: metric === 'contacts'
      });
    } else {
      // If one is hidden, show both
      setVisibleMetrics({
        cards: true,
        contacts: true
      });
    }
  };

  const getFilteredChartData = () => {
    const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    const datasets = [];
    
    if (visibleMetrics.cards) {
      datasets.push({
        data: weeklyData.datasets[0].data,
        color: () => '#FF526D'
      });
    }
    
    if (visibleMetrics.contacts) {
      datasets.push({
        data: weeklyData.datasets[1].data,
        color: () => '#1B2559'
      });
    }
    
    return {
      labels: months,
      datasets
    };
  };

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
        
        {/* Overview Cards - Removed ellipses icon */}
        <View style={styles.overviewContainer}>
          <TouchableOpacity 
            style={[styles.overviewCard, { backgroundColor: COLORS.primary }]}
            onPress={() => setShowCardsModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardNumber}>{totalCards}</Text>
            <Text style={styles.cardLabel}>Total Cards</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" style={styles.cardIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overviewCard, { backgroundColor: '#1B2559' }]}
            onPress={() => setShowContactsModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardNumber}>{totalContacts}</Text>
            <Text style={styles.cardLabel}>Total Contacts</Text>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="white" style={styles.cardIcon} />
          </TouchableOpacity>
        </View>

        {/* Weekly Growth Section - Removed ellipses icon */}
        <View style={styles.growthSection}>
          <View style={styles.growthHeader}>
            <Text style={styles.sectionTitle}>Monthly Growth</Text>
          </View>
          
          <LineChart
            data={getFilteredChartData()}
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
            <TouchableOpacity 
              style={[styles.legendItem, !visibleMetrics.cards && styles.legendItemInactive]}
              onPress={() => toggleMetric('cards')}
            >
              <View style={[styles.legendDot, { backgroundColor: '#FF526D' }]} />
              <Text style={[styles.legendText, !visibleMetrics.cards && styles.legendTextInactive]}>
                Total Cards
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.legendItem, !visibleMetrics.contacts && styles.legendItemInactive]}
              onPress={() => toggleMetric('contacts')}
            >
              <View style={[styles.legendDot, { backgroundColor: '#1B2559' }]} />
              <Text style={[styles.legendText, !visibleMetrics.contacts && styles.legendTextInactive]}>
                Total Contacts
              </Text>
            </TouchableOpacity>
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

      <ContactsModal 
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={contactsList}
      />

      <CardsModal 
        visible={showCardsModal}
        onClose={() => setShowCardsModal(false)}
        cards={cardsList}
      />
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
    marginRight:50
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalList: {
    maxHeight: '90%',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B2559',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  legendItemInactive: {
    opacity: 0.5,
  },
  legendTextInactive: {
    color: '#999',
  },
});