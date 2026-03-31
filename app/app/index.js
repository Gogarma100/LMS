import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      router.replace('/dashboard');
    }
  };

  const handleAuth = async () => {
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await api.post(endpoint, { email, password });
      if (isRegister) {
        Alert.alert('Success', 'Account created! Please login.');
        setIsRegister(false);
      } else {
        await AsyncStorage.setItem('accessToken', res.data.accessToken);
        router.replace('/dashboard');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Kokostream</Text>
      <Text style={styles.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.toggleText}>
          {isRegister ? 'Already have an account? Login' : 'New here? Create account'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 18, color: '#64748b', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: '#2563eb', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  toggleText: { marginTop: 20, textAlign: 'center', color: '#2563eb' },
});
