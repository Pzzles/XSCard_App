import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { getEventStatus } from '../../services/eventService';
import { toastService } from '../../hooks/useToast';

// Generic stack any – avoids tight coupling with navigation types
export interface PaymentPendingParams {
  eventId: string;
}

type Props = NativeStackScreenProps<any, any>;

const POLL_INTERVAL = 5000; // 5 seconds

export default function PaymentPendingScreen({ route }: Props) {
  const { eventId } = route.params as PaymentPendingParams;
  const navigation = useNavigation();

  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async (silent = false) => {
    try {
      if (!silent) setChecking(true);
      const evt = await getEventStatus(eventId);
      if (evt?.status === 'published') {
        toastService.success('Event Published', 'Payment confirmed – your event is now live.');
        // Navigate back to EventDetails with refreshed data
        navigation.navigate('EventDetails', { eventId });
      }
    } catch (error) {
      console.log('[PaymentPending] Error checking status:', error);
    } finally {
      if (!silent) setChecking(false);
    }
  };

  useEffect(() => {
    // Start polling
    intervalRef.current = setInterval(() => checkStatus(true), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const manualRefresh = () => {
    checkStatus();
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name="hourglass-top" size={64} color={COLORS.primary} />
      <Text style={styles.title}>Waiting for Payment Confirmation</Text>
      <Text style={styles.subtitle}>
        Once the payment is verified your event will be published automatically.
      </Text>
      {checking && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 16 }} />}
      <TouchableOpacity style={styles.refreshButton} onPress={manualRefresh} disabled={checking}>
        <MaterialIcons name="refresh" size={20} color={COLORS.white} />
        <Text style={styles.refreshText}>{checking ? 'Checking...' : 'Refresh Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  refreshText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 