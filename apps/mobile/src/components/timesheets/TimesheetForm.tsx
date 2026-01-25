/**
 * TimesheetForm Component
 *
 * Form for creating new timesheet entries with project/task selection.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ChevronDown, Calendar, Clock, FileText, Check, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, borderRadius, shadows, spacing } from '../../theme';
import type { Project, Task } from '../../hooks/useProjects';
import type { CreateTimesheetInput } from '../../hooks/useTimesheets';

/**
 * Props for TimesheetForm
 */
interface TimesheetFormProps {
  projects: Project[];
  onSubmit: (input: CreateTimesheetInput) => Promise<void>;
  isSubmitting: boolean;
  initialDate?: string;
  error?: string | null;
}

/**
 * Format date for display
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'EEEE, MMM d, yyyy');
}

/**
 * Picker modal for selection
 */
interface PickerModalProps<T> {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  items: T[];
  title: string;
  keyExtractor: (item: T) => string;
  labelExtractor: (item: T) => string;
  selectedKey?: string;
}

function PickerModal<T>({
  visible,
  onClose,
  onSelect,
  items,
  title,
  keyExtractor,
  labelExtractor,
  selectedKey,
}: PickerModalProps<T>) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.container}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.silver[500]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => {
              const isSelected = keyExtractor(item) === selectedKey;
              return (
                <TouchableOpacity
                  style={[
                    pickerStyles.item,
                    isSelected && pickerStyles.itemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.itemText,
                      isSelected && pickerStyles.itemTextSelected,
                    ]}
                  >
                    {labelExtractor(item)}
                  </Text>
                  {isSelected && (
                    <Check size={20} color={colors.blue[600]} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={pickerStyles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.silver[200],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.navy[900],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  itemSelected: {
    backgroundColor: colors.blue[50],
  },
  itemText: {
    fontSize: typography.fontSize.base,
    color: colors.navy[800],
  },
  itemTextSelected: {
    color: colors.blue[600],
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.silver[100],
  },
});

/**
 * TimesheetForm Component
 */
export function TimesheetForm({
  projects,
  onSubmit,
  isSubmitting,
  initialDate,
  error,
}: TimesheetFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date] = useState(initialDate || today);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Available tasks for selected project
  const availableTasks = useMemo(() => {
    return selectedProject?.tasks || [];
  }, [selectedProject]);

  // Reset task when project changes
  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setSelectedTask(null);
    setValidationError(null);
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    if (!selectedProject) {
      setValidationError('Please select a project');
      return false;
    }
    if (!selectedTask) {
      setValidationError('Please select a task');
      return false;
    }
    const hoursNum = parseInt(hours, 10) || 0;
    const minutesNum = parseInt(minutes, 10) || 0;
    if (hoursNum === 0 && minutesNum === 0) {
      setValidationError('Please enter time worked');
      return false;
    }
    if (hoursNum > 24 || minutesNum > 59) {
      setValidationError('Invalid time values');
      return false;
    }
    if (hoursNum * 60 + minutesNum > 1440) {
      setValidationError('Time cannot exceed 24 hours');
      return false;
    }
    setValidationError(null);
    return true;
  }, [selectedProject, selectedTask, hours, minutes]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validate() || !selectedProject || !selectedTask) return;

    const input: CreateTimesheetInput = {
      date,
      projectId: selectedProject.id,
      taskId: selectedTask.id,
      hours: parseInt(hours, 10) || 0,
      minutes: parseInt(minutes, 10) || 0,
      notes: notes.trim() || undefined,
    };

    await onSubmit(input);
  }, [date, selectedProject, selectedTask, hours, minutes, notes, onSubmit, validate]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Display */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Calendar size={18} color={colors.silver[500]} />
            <Text style={styles.label}>Date</Text>
          </View>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
          </View>
        </View>

        {/* Project Picker */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <FileText size={18} color={colors.silver[500]} />
            <Text style={styles.label}>Project</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.picker,
              !selectedProject && styles.pickerPlaceholder,
            ]}
            onPress={() => setShowProjectPicker(true)}
          >
            <Text
              style={[
                styles.pickerText,
                !selectedProject && styles.pickerTextPlaceholder,
              ]}
            >
              {selectedProject?.name || 'Select a project'}
            </Text>
            <ChevronDown size={20} color={colors.silver[400]} />
          </TouchableOpacity>
        </View>

        {/* Task Picker (only show when project selected) */}
        {selectedProject && (
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <FileText size={18} color={colors.silver[500]} />
              <Text style={styles.label}>Task</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.picker,
                !selectedTask && styles.pickerPlaceholder,
              ]}
              onPress={() => setShowTaskPicker(true)}
            >
              <Text
                style={[
                  styles.pickerText,
                  !selectedTask && styles.pickerTextPlaceholder,
                ]}
              >
                {selectedTask?.name || 'Select a task'}
              </Text>
              <ChevronDown size={20} color={colors.silver[400]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Time Entry */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Clock size={18} color={colors.silver[500]} />
            <Text style={styles.label}>Time Worked</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.timeInput}
                value={hours}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setHours(num);
                  setValidationError(null);
                }}
                placeholder="0"
                placeholderTextColor={colors.silver[400]}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeUnit}>hours</Text>
            </View>
            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.timeInput}
                value={minutes}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setMinutes(num);
                  setValidationError(null);
                }}
                placeholder="0"
                placeholderTextColor={colors.silver[400]}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeUnit}>min</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <FileText size={18} color={colors.silver[500]} />
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.optional}>(optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you work on?"
            placeholderTextColor={colors.silver[400]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Error Display */}
        {(validationError || error) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{validationError || error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Add Entry</Text>
          )}
        </TouchableOpacity>

        {/* Project Picker Modal */}
        <PickerModal
          visible={showProjectPicker}
          onClose={() => setShowProjectPicker(false)}
          onSelect={handleProjectSelect}
          items={projects}
          title="Select Project"
          keyExtractor={(p) => p.id}
          labelExtractor={(p) => `${p.name} (${p.code})`}
          selectedKey={selectedProject?.id}
        />

        {/* Task Picker Modal */}
        <PickerModal
          visible={showTaskPicker}
          onClose={() => setShowTaskPicker(false)}
          onSelect={(task: Task) => {
            setSelectedTask(task);
            setValidationError(null);
          }}
          items={availableTasks}
          title="Select Task"
          keyExtractor={(t) => t.id}
          labelExtractor={(t) => `${t.name} (${t.code})`}
          selectedKey={selectedTask?.id}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.silver[50],
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  field: {
    marginBottom: spacing[5],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.navy[800],
  },
  required: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error.main,
  },
  optional: {
    fontSize: typography.fontSize.xs,
    color: colors.silver[500],
    marginLeft: spacing[1],
  },
  dateDisplay: {
    backgroundColor: colors.silver[100],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  dateText: {
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
    fontWeight: '500',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.silver[200],
    ...shadows.sm,
  },
  pickerPlaceholder: {
    borderColor: colors.silver[300],
  },
  pickerText: {
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
  },
  pickerTextPlaceholder: {
    color: colors.silver[400],
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  timeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.silver[200],
    paddingHorizontal: spacing[3],
    ...shadows.sm,
  },
  timeInput: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.navy[900],
    paddingVertical: spacing[3],
    textAlign: 'center',
  },
  timeUnit: {
    fontSize: typography.fontSize.sm,
    color: colors.silver[500],
    marginLeft: spacing[1],
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.silver[200],
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.navy[900],
    minHeight: 100,
    ...shadows.sm,
  },
  errorContainer: {
    backgroundColor: colors.semantic.error.light,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error.main,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.blue[600],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.silver[400],
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TimesheetForm;
