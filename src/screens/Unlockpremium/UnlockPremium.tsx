import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  UnlockPremium: undefined;
  // ... other screens
};

const UnlockPremium = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'UnlockPremium'>) => {
  const [selectedPlan, setSelectedPlan] = useState('annually');
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    const getUserPlan = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { plan } = JSON.parse(userData);
          setUserPlan(plan);
        }
      } catch (error) {
        console.error('Error getting user plan:', error);
      }
    };

    getUserPlan();
  }, []);

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will lose access to premium features at the end of your billing period.',
      [
        {
          text: 'No, Keep Premium',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // Add your subscription cancellation logic here
            Alert.alert('Subscription Cancelled', 'Your subscription will end at the end of your billing period.');
          },
        },
      ]
    );
  };

  const renderPremiumUserUI = () => (
    <View style={styles.premiumContainer}>
      <MaterialIcons name="verified" size={80} color={COLORS.primary} />
      <Text style={styles.premiumTitle}>Premium Subscription Active</Text>
      <Text style={styles.premiumSubtitle}>
        You have access to all premium features
      </Text>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancelSubscription}
      >
        <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {userPlan === 'premium' ? (
        renderPremiumUserUI()
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>
            Be a better networker, upgrade to XSCard premium
          </Text>

          <TouchableOpacity 
            style={[styles.trialButton, { marginVertical: 20 }]}
          >
            <Text style={styles.trialButtonText}>Start your 7-day free trial</Text>
          </TouchableOpacity>

          {/* Pricing Options */}
          <View style={styles.pricingContainer}>
            <TouchableOpacity 
              style={[
                styles.planOption,
                selectedPlan === 'annually' && styles.selectedPlan
              ]}
              onPress={() => setSelectedPlan('annually')}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save R120</Text>
              </View>
              <Text style={styles.planType}>Annually</Text>
              <Text style={styles.price}>R1,800.00</Text>
              <Text style={styles.monthlyPrice}>R150.00/month</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.planOption,
                selectedPlan === 'monthly' && styles.selectedPlan
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planType}>Monthly</Text>
              <Text style={styles.price}>R159.99</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cancelText}>7-day free trial. Cancel anytime</Text>

          {/* Feature Comparison */}
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonCard}>
              <View style={styles.headerRow}>
                <View style={styles.featureHeaderColumn}>
                  <Text style={styles.headerTitle}>Features</Text>
                </View>
                <View style={styles.valueHeaderColumn}>
                  <Text style={styles.headerText}>Free</Text>
                </View>
                <View style={styles.valueHeaderColumn}>
                  <Text style={styles.headerTextPremium}>Premium</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Maximum number of cards</Text>
                  <Text style={styles.featureSubtitle}>Create up to 5 cards with XSCard</Text>
                </View>
                <View style={styles.valueColumn}>
                  <Text style={styles.freeValue}>1</Text>
                </View>
                <View style={styles.valueColumn}>
                  <Text style={styles.premiumValue}>5</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Add a custom color to your card</Text>
                  <Text style={styles.featureSubtitle}>Set your color theme to be any color you like.</Text>
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="lock" size={24} color="#9E9E9E" />
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="check-circle" size={24} color="#FF6B6B" />
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>QR code customization</Text>
                  <Text style={styles.featureSubtitle}>Premium QR code designs with brand colours</Text>
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="lock" size={24} color="#9E9E9E" />
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="check-circle" size={24} color="#FF6B6B" />
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Analytics</Text>
                  <Text style={styles.featureSubtitle}>Track scans, contacts, and engagement</Text>
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="lock" size={24} color="#9E9E9E" />
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="check-circle" size={24} color="#FF6B6B" />
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Email support</Text>
                  <Text style={styles.featureSubtitle}>48h response → 12h priority support</Text>
                </View>
                <View style={styles.valueColumn}>
                  <Text style={styles.freeValue}>48h</Text>
                </View>
                <View style={styles.valueColumn}>
                  <Text style={styles.premiumValue}>12h</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Calendar integration</Text>
                  <Text style={styles.featureSubtitle}>Direct calendar booking and invites</Text>
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="lock" size={24} color="#9E9E9E" />
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="check-circle" size={24} color="#FF6B6B" />
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featureColumn}>
                  <Text style={styles.featureTitle}>Social media integration</Text>
                  <Text style={styles.featureSubtitle}>Connect all your social profiles</Text>
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="lock" size={24} color="#9E9E9E" />
                </View>
                <View style={styles.valueColumn}>
                  <MaterialIcons name="check-circle" size={24} color="#FF6B6B" />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity>
            <Text style={styles.alreadyPaidText}>
              I have already paid for XSCard Premium.{' '}
              <Text style={styles.tapHereText}>Tap here</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTrialButton}>
            <Text style={styles.bottomTrialButtonText}>Start 7-day free trial</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  closeButton: {
    padding: 15,
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#000',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  trialButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  trialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pricingContainer: {
    marginVertical: 20,
  },
  planOption: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  saveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planType: {
    fontSize: 16,
    color: '#666',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  monthlyPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  cancelText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  comparisonContainer: {
    marginTop: 20,
    paddingHorizontal: 0,
  },
  comparisonCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  featureHeaderColumn: {
    flex: 2,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 2,
    fontSize: 16,
    color: '#666',
  },
  valueHeaderColumn: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    color: '#666',
  },
  headerTextPremium: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  featureColumn: {
    flex: 2,
    paddingRight: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeValue: {
    fontSize: 16,
    color: '#666',
  },
  premiumValue: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  bottomTrialButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 20,
  },
  bottomTrialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alreadyPaidText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontSize: 14,
  },
  tapHereText: {
    textDecorationLine: 'underline',
    color: '#666',
  },
  premiumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 20,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UnlockPremium;
