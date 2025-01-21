import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);


      const handleSignUp = async () => {
        setIsLoading(true);
        try {
                // const userData = {
      //   firstName,
      //   lastName,
      //   email,
      //   phoneNumber,
      //   // Add company logo and profile picture handling later
      // };

          const userData = {
            name: firstName,
            status: status,
          };
      
          const response = await fetch('https://b3f2-102-217-178-202.ngrok-free.app/AddUser', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(userData),
          });
      
          // Log response headers and status
          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
      
          // Check content type
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error("Server returned non-JSON response");
          }
      
          const data = await response.json();
          
          if (response.ok) {
            navigation.navigate('SignIn');
          } else {
            alert(data.message || 'Signup failed');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('Network error, please try again');
        } finally {
          setIsLoading(false);
        }
      };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      
      <TextInput
        style={styles.input}
        placeholder="First name..."
        value={firstName}
        onChangeText={setFirstName}
        placeholderTextColor="#999"
      />

<TextInput
  style={styles.input}
  placeholder="Status..."
  value={status}
  onChangeText={setStatus}
  placeholderTextColor="#999"
/>

      <TextInput
        style={styles.input}
        placeholder="Last name..."
        value={lastName}
        onChangeText={setLastName}
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        placeholder="Mail..."
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        placeholder="Phone number..."
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholderTextColor="#999"
      />

      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>Company Logo:</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.uploadLabel}>Profile Picture:</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
      style={styles.signUpButton}
      onPress={handleSignUp}
      disabled={isLoading}
      >
        <Text style={styles.signUpButtonText}>Sign Up</Text>
      </TouchableOpacity>

      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.signInLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signInText: {
    color: '#666',
    fontSize: 16,
  },
  signInLink: {
    color: COLORS.primary,
    fontSize: 16,
  },
}); 