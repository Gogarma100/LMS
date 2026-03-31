import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function DashboardScreen() {
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [completedModules, setCompletedModules] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrolledRes, progressRes, userRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/auth/me/courses'),
        api.get('/api/courses/progress'),
        api.get('/api/auth/me')
      ]);
      setCourses(coursesRes.data);
      setEnrolledIds(enrolledRes.data.map(c => c.id));
      
      const pMap = progressRes.data.reduce((acc, p) => {
        acc[p.course.id] = p;
        return acc;
      }, {});
      setProgressMap(pMap);
      
      setUser(userRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId, isEnrolled) => {
    try {
      const action = isEnrolled ? 'unenroll' : 'enroll';
      const method = isEnrolled ? 'delete' : 'post';
      await api[method](`/api/courses/${courseId}/${action}`);
      fetchData();
    } catch (err) {
      console.error('Enrollment failed', err);
    }
  };

  const handleUpdateProgress = async (courseId) => {
    const current = progressMap[courseId]?.percentageComplete || 0;
    const nextProgress = current >= 100 ? 0 : current + 10;
    
    try {
      await api.post(`/api/courses/${courseId}/progress`, {
        percentageComplete: nextProgress
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update progress', err);
    }
  };

  const handleToggleModule = async (courseId, moduleId) => {
    try {
      await api.post(`/api/courses/${courseId}/progress/toggle-module`, {
        moduleId
      });
      // Refresh modules list and dashboard data
      const progressRes = await api.get(`/api/courses/${courseId}/progress`);
      setCompletedModules(progressRes.data.completedModules || []);
      fetchData();
    } catch (err) {
      console.error('Failed to toggle module', err);
    }
  };

  const openModulesModal = async (course) => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        api.get(`/api/courses/${course.id}`),
        api.get(`/api/courses/${course.id}/progress`)
      ]);
      setModules(courseRes.data.modules || []);
      setCompletedModules(progressRes.data.completedModules || []);
      setSelectedCourse(course);
    } catch (err) {
      console.error('Failed to fetch modules', err);
    }
  };

  const handleViewUsers = async (courseId) => {
    try {
      const res = await api.get(`/api/courses/${courseId}/users`);
      const userList = res.data.map(u => u.email).join('\n');
      Alert.alert('Enrolled Users', userList || 'No users enrolled yet');
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    router.replace('/');
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            {user && <Text style={styles.subtitle}>{user.email} ({user.role})</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isEnrolled = enrolledIds.includes(item.id);
          const progress = progressMap[item.id] || { percentageComplete: 0 };
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              
              {isEnrolled && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressValue}>{progress.percentageComplete}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress.percentageComplete}%` }]} />
                  </View>
                </View>
              )}
              
              <View style={styles.actions}>
                {user?.role === 'admin' ? (
                  <TouchableOpacity 
                    style={styles.adminBtn} 
                    onPress={() => handleViewUsers(item.id)}
                  >
                    <Text style={styles.btnText}>View Users</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.enrollBtn, isEnrolled && styles.unenrollBtn]} 
                      onPress={() => handleEnroll(item.id, isEnrolled)}
                    >
                      <Text style={styles.btnText}>{isEnrolled ? 'Unenroll' : 'Enroll Now'}</Text>
                    </TouchableOpacity>
                    {isEnrolled && (
                      <>
                        <TouchableOpacity 
                          style={styles.progressBtn} 
                          onPress={() => handleUpdateProgress(item.id)}
                        >
                          <Text style={styles.btnText}>+10%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.modulesBtn} 
                          onPress={() => openModulesModal(item)}
                        >
                          <Text style={styles.btnText}>Modules</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={!!selectedCourse}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCourse?.title} Modules</Text>
            <ScrollView style={styles.moduleList}>
              {modules.length > 0 ? (
                modules.sort((a, b) => a.order - b.order).map(mod => (
                  <View key={mod.id} style={styles.moduleItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{mod.title}</Text>
                      <Text style={styles.moduleContent}>{mod.content}</Text>
                    </View>
                    <Switch
                      value={completedModules.includes(mod.id)}
                      onValueChange={() => handleToggleModule(selectedCourse.id, mod.id)}
                      trackColor={{ false: "#e2e8f0", true: "#10b981" }}
                      thumbColor="#fff"
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.noModules}>No modules found for this course.</Text>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setSelectedCourse(null)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  logoutText: { color: '#ef4444', fontWeight: '600' },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', marginBottom: 5 },
  cardDesc: { fontSize: 14, color: '#64748b', marginBottom: 15 },
  progressContainer: { marginBottom: 15 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 12, color: '#64748b' },
  progressValue: { fontSize: 12, fontWeight: 'bold', color: '#10b981' },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981' },
  actions: { flexDirection: 'row', gap: 10 },
  enrollBtn: { backgroundColor: '#10b981', padding: 10, borderRadius: 8, alignItems: 'center', flex: 2 },
  unenrollBtn: { backgroundColor: '#ef4444' },
  progressBtn: { backgroundColor: '#6366f1', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  modulesBtn: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1.5 },
  adminBtn: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
  moduleList: { marginBottom: 20 },
  moduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  moduleContent: { fontSize: 12, color: '#64748b', marginTop: 2 },
  noModules: { textAlign: 'center', color: '#64748b', marginVertical: 20 },
  closeBtn: { backgroundColor: '#64748b', padding: 15, borderRadius: 10, alignItems: 'center' },
});
