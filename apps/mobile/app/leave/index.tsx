/**
 * Leave Screen
 *
 * Displays leave balances, allows leave requests, and shows request history.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Calendar,
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing, shadows } from '../../src/theme';
import { api } from '../../src/lib/api';
import { format } from 'date-fns';

interface LeaveBalance {
  id: string;
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  createdAt: string;
  reviewer?: {
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
}

export default function LeaveScreen() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Request form state
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [balanceRes, requestsRes, typesRes] = await Promise.all([
        api.get<{ balances: LeaveBalance[] }>('/leaves/balance'),
        api.get<{ data: LeaveRequest[]; total: number }>('/leaves/requests'),
        api.get<LeaveType[]>('/leaves/types'),
      ]);

      if (balanceRes.success && balanceRes.data) {
        const balData = balanceRes.data as any;
        setBalances(balData.balances || []);
      }
      if (requestsRes.success && requestsRes.data) {
        setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
      }
      if (typesRes.success && typesRes.data) {
        setLeaveTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitRequest = async () => {
    if (!selectedType || !startDate || !endDate || !reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/leaves/request', {
        leaveType: selectedType,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (res.success) {
        Alert.alert('Success', 'Leave request submitted.');
        closeModal();
        fetchData();
      } else {
        Alert.alert('Error', (res as any).error?.message || 'Failed to submit request.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowRequestModal(false);
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setShowTypePicker(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return colors.semantic.success.main;
      case 'Rejected':
        return colors.semantic.error.main;
      case 'Pending':
        return colors.semantic.warning.main;
      default:
        return colors.silver[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle size={16} color={colors.semantic.success.main} />;
      case 'Rejected':
        return <XCircle size={16} color={colors.semantic.error.main} />;
      case 'Pending':
        return <Clock size={16} color={colors.semantic.warning.main} />;
      default:
        return <Clock size={16} color={colors.silver[500]} />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchData} />
        }
      >
        {/* Leave Balances */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <Text style={styles.sectionTitle}>Leave Balances</Text>
          {balances.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No leave balances configured</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.balancesRow}
            >
              {balances.map((balance) => (
                <View key={balance.id} style={styles.balanceCard}>
                  <Text style={styles.balanceType}>{balance.leaveType}</Text>
                  <Text style={styles.balanceCount}>
                    {balance.remainingDays}
                  </Text>
                  <Text style={styles.balanceLabel}>
                    of {balance.totalDays} remaining
                  </Text>
                  <View style={styles.balanceBar}>
                    <View
                      style={[
                        styles.balanceBarFill,
                        {
                          width: `${Math.min(
                            ((balance.totalDays - balance.remainingDays) / balance.totalDays) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Recent Requests */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          {requests.length === 0 && !isLoading ? (
            <View style={styles.emptyCard}>
              <Calendar size={32} color={colors.silver[300]} />
              <Text style={styles.emptyText}>No leave requests yet</Text>
            </View>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestType}>{request.leaveType}</Text>
                  <View style={styles.statusBadge}>
                    {getStatusIcon(request.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(request.status) },
                      ]}
                    >
                      {request.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestDates}>
                  {format(new Date(request.startDate), 'MMM d')} -{' '}
                  {format(new Date(request.endDate), 'MMM d, yyyy')}
                </Text>
                <Text style={styles.requestDays}>
                  {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                </Text>
                {request.reason && (
                  <Text style={styles.requestReason} numberOfLines={2}>
                    {request.reason}
                  </Text>
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB for new request */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowRequestModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Leave Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <X size={24} color={colors.navy[900]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Leave Request</Text>
            <TouchableOpacity
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Leave Type */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !selectedType && styles.placeholderText,
                ]}
              >
                {selectedType || 'Select leave type'}
              </Text>
              <ChevronDown size={20} color={colors.silver[400]} />
            </TouchableOpacity>
            {showTypePicker && (
              <View style={styles.pickerOptions}>
                {leaveTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id || type.code}
                    style={[
                      styles.pickerOption,
                      selectedType === type.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedType(type.code);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedType === type.code &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Start Date */}
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.silver[400]}
            />

            {/* End Date */}
            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.silver[400]}
            />

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for leave..."
              placeholderTextColor={colors.silver[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  balancesRow: {
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: 150,
    ...shadows.sm,
  },
  balanceType: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.silver[600],
    marginBottom: spacing[1],
  },
  balanceCount: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.navy[900],
  },
  balanceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    marginBottom: spacing[2],
  },
  balanceBar: {
    height: 4,
    backgroundColor: colors.silver[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  balanceBarFill: {
    height: '100%',
    backgroundColor: colors.blue[600],
    borderRadius: borderRadius.full,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.silver[500],
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  requestType: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.navy[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  requestDates: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[600],
  },
  requestDays: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[1],
  },
  requestReason: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  submitButton: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.blue[600],
  },
  submitButtonDisabled: {
    color: colors.silver[400],
  },
  modalBody: {
    padding: spacing[4],
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.navy[900],
    marginBottom: spacing[1],
    marginTop: spacing[4],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.silver[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing[3],
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.silver[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  pickerButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  placeholderText: {
    color: colors.silver[400],
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: colors.silver[200],
    borderRadius: borderRadius.lg,
    marginTop: spacing[1],
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[100],
  },
  pickerOptionSelected: {
    backgroundColor: colors.blue[50],
  },
  pickerOptionText: {
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  pickerOptionTextSelected: {
    color: colors.blue[600],
    fontWeight: '500',
  },
});
