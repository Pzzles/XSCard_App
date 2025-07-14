import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  Linking,
  BackHandler 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { checkEventPaymentStatus } from '../../services/eventService';
import { useToast } from '../../hooks/useToast';
import { RootStackParamList, PaymentPendingParams } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentPending'>;

const POLL_INTERVAL = 5000; // 5 seconds - less aggressive polling
const MAX_POLL_ATTEMPTS = 60; // 5 minutes total (60 * 5 seconds)

export default function PaymentPendingScreen({ route }: Props) {
  const { eventId, paymentUrl: initialPaymentUrl, paymentReference, eventTitle } = route.params;
  const navigation = useNavigation();
  const toast = useToast();

  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending_payment');
  const [pollAttempts, setPollAttempts] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | undefined>(initialPaymentUrl);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const openPaymentUrl = () => {
    if (paymentUrl) {
      Linking.openURL(paymentUrl).catch(err => {
        console.error('Error opening payment URL:', err);
        toast.error('Error', 'Unable to open payment page.');
      });
    }
  };

  const checkPaymentStatus = async (silent = false) => {
    try {
      if (!silent) {
        setChecking(true);
        setError(null);
      }
      
      const result = await checkEventPaymentStatus(eventId);
      setLastChecked(new Date());
      
      if (result.success && result.event) {
        const newStatus = result.event.status;
        setPaymentStatus(newStatus);
        
        // Set payment URL if returned from backend (for pending payments)
        if (result.paymentUrl && !paymentUrl) {
          setPaymentUrl(result.paymentUrl);
        }
        
        if (newStatus === 'published') {
          // Payment successful, event published!
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          toast.success('🎉 Event Published!', 'Payment confirmed – your event is now live.');
          
          // Navigate back to MyEvents with refresh
          navigation.navigate('MyEventsScreen' as never);
          return;
        } else if (newStatus === 'draft') {
          // Payment failed or expired
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          toast.error('Payment Failed', 'Payment was not completed or failed.');
          setError('Payment was not completed. You can retry publishing your event.');
          return;
        }
      }
      
      // Handle specific payment statuses
      if (result.paymentStatus === 'abandoned') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setPollingActive(false);
        toast.warning('Payment Abandoned', 'Payment was abandoned. Your event has been reverted to draft status.');
        
        // Navigate back to MyEvents since event is now in draft
        setTimeout(() => {
          navigation.navigate('MyEventsScreen' as never);
        }, 2000);
        return;
      } else if (result.paymentStatus === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setPollingActive(false);
        toast.error('Payment Failed', 'Payment failed. Please try again.');
        setError('Payment failed. You can retry publishing your event.');
        return;
      }
      
      // Still pending, increment attempts
      setPollAttempts(prev => prev + 1);
      
    } catch (error) {
      console.error('[PaymentPending] Error checking payment status:', error);
      setError('Unable to check payment status. Please check your connection.');
      
      if (!silent) {
        toast.error('Connection Error', 'Unable to check payment status. Please try again.');
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Handle back button - warn user about incomplete payment
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Payment in Progress',
          'Your payment is still being processed. Are you sure you want to leave this screen?',
          [
            { text: 'Stay Here', style: 'cancel' },
            { 
              text: 'Leave', 
              style: 'destructive',
              onPress: () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                navigation.goBack();
              }
            },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  useEffect(() => {
    // Auto-open payment URL immediately if available
    if (paymentUrl) {
      openPaymentUrl();
    }
  }, [paymentUrl]);

  useEffect(() => {
    // Start with appropriate initial behavior based on whether we have payment URL
    if (initialPaymentUrl) {
      // Fresh payment session - start polling after short delay
      console.log('[PaymentPending] Fresh payment session, starting polling with delay');
      const delayedStart = setTimeout(() => {
        checkPaymentStatus(true);
        startPolling();
      }, 10000); // 10 seconds to give user time to start payment
      
      return () => {
        clearTimeout(delayedStart);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      // No payment URL - check status immediately to fetch it
      console.log('[PaymentPending] No payment URL, checking status immediately');
      checkPaymentStatus();
      startPolling();
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [eventId]);

  const startPolling = () => {
    // Start polling with exponential backoff
    let currentInterval = POLL_INTERVAL;
    
    intervalRef.current = setInterval(() => {
      if (pollingActive && pollAttempts < MAX_POLL_ATTEMPTS) {
        checkPaymentStatus(true);
        
        // Increase interval after 10 attempts (slow down polling)
        if (pollAttempts > 10) {
          currentInterval = Math.min(currentInterval * 1.2, 15000); // Max 15 seconds
          clearInterval(intervalRef.current!);
          intervalRef.current = setInterval(() => {
            if (pollingActive && pollAttempts < MAX_POLL_ATTEMPTS) {
              checkPaymentStatus(true);
            } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setPollingActive(false);
              setError('Payment verification timeout. Please check your event status manually.');
              toast.warning('Verification Timeout', 'Payment verification took too long. Please check your events list.');
            }
          }, currentInterval);
        }
      } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        // Stop polling after max attempts
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPollingActive(false);
        setError('Payment verification timeout. Please check your event status manually.');
        toast.warning('Verification Timeout', 'Payment verification took too long. Please check your events list.');
      }
    }, currentInterval);
  };

  const manualRefresh = () => {
    setPollAttempts(0); // Reset attempts
    setPollingActive(true);
    setError(null);
    checkPaymentStatus();
  };

  const goBackToEvents = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    navigation.navigate('MyEventsScreen' as never);
  };

  const retryPayment = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    navigation.goBack(); // Go back to publish the event again
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToEvents} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Processing</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          {paymentStatus === 'published' ? (
            <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
          ) : error ? (
            <MaterialIcons name="error" size={80} color="#F44336" />
          ) : (
            <MaterialIcons name="hourglass-top" size={80} color={COLORS.primary} />
          )}
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>
          {paymentStatus === 'published' 
            ? 'Event Published!' 
            : error 
              ? 'Payment Issue' 
              : 'Processing Payment...'}
        </Text>
        
        <Text style={styles.subtitle}>
          {paymentStatus === 'published' 
            ? 'Your event is now live and visible to attendees.' 
            : error 
              ? error
              : paymentUrl 
                ? 'The payment page will open automatically. Complete your payment and return here to see the status.'
                : 'We are verifying your payment. This usually takes a few moments.'}
        </Text>

        {/* Event Details */}
        {eventTitle && (
          <View style={styles.eventInfo}>
            <MaterialIcons name="event" size={20} color={COLORS.gray} />
            <Text style={styles.eventTitle}>{eventTitle}</Text>
          </View>
        )}

        {/* Payment Reference */}
        {paymentReference && (
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Payment Reference:</Text>
            <Text style={styles.referenceText}>{paymentReference}</Text>
          </View>
        )}

        {/* Status Indicators */}
        <View style={styles.statusContainer}>
          {checking && (
            <View style={styles.statusItem}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Checking payment status...</Text>
            </View>
          )}
          
          {lastChecked && !checking && (
            <Text style={styles.lastCheckedText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}

          {pollAttempts > 0 && (
            <Text style={styles.attemptText}>
              Checking {pollAttempts}/{MAX_POLL_ATTEMPTS}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {error ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={retryPayment}>
                <MaterialIcons name="refresh" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Retry Payment</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={goBackToEvents}>
                <Text style={styles.secondaryButtonText}>Back to Events</Text>
              </TouchableOpacity>
            </>
          ) : paymentStatus === 'published' ? (
            <TouchableOpacity style={styles.primaryButton} onPress={goBackToEvents}>
              <MaterialIcons name="list" size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>View My Events</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={manualRefresh} 
                disabled={checking}
              >
                <MaterialIcons name="refresh" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>
                  {checking ? 'Checking...' : 'Check Now'}
                </Text>
              </TouchableOpacity>

              {paymentUrl && (
                <TouchableOpacity style={styles.secondaryButton} onPress={openPaymentUrl}>
                  <MaterialIcons name="open-in-browser" size={20} color={COLORS.primary} />
                  <Text style={styles.secondaryButtonText}>Open Payment Page</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 This screen will automatically update when your payment is confirmed.
          </Text>
          {!error && paymentStatus !== 'published' && (
            <Text style={styles.helpText}>
              If payment was completed but status doesn't update, try "Check Now".
            </Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  referenceContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  referenceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: 'monospace',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  lastCheckedText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  attemptText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
}); 