import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Update this type to match your actual navigation type
type RootStackParamList = {
  Home: undefined;
  AddCards: undefined;
  EditCard: undefined;
  // ... other screens ...
};

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleAddPress = () => {
    navigation.navigate('AddCards');
  };

  const handleEditPress = () => {
    navigation.navigate('EditCard');
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.icon}>
        <MaterialIcons name="menu" size={24} color={COLORS.black} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.iconContainer}>
        <TouchableOpacity style={styles.icon} onPress={handleAddPress}>
          <MaterialIcons name="add" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.icon} onPress={handleEditPress}>
          <MaterialIcons name="edit" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    paddingTop: 52,
    position: 'absolute',
    left: '55%',
    transform: [{ translateX: '-50%' }],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
  iconContainer: {
    flexDirection: 'row',
  },
});