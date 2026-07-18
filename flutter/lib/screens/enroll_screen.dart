import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

/// Enroll Screen
/// Lets a student enroll in a school/region, and optionally link to a
/// specific teacher by their teacherId.
///
/// Wired to real backend:
///   POST /api/v1/enrollments
///   body: { schoolOrRegion: string (required), teacherId?: string }
///   409 -> student is already enrolled in that school/region
///
/// Returns `true` via Navigator.pop when enrollment succeeds, so the
/// caller (StudentHomeScreen) knows to refresh its enrollment list.
class EnrollScreen extends StatefulWidget {
  const EnrollScreen({super.key});

  @override
  State<EnrollScreen> createState() => _EnrollScreenState();
}

class _EnrollScreenState extends State<EnrollScreen> {
  final _formKey = GlobalKey<FormState>();
  final _schoolOrRegionController = TextEditingController();
  final _teacherIdController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _schoolOrRegionController.dispose();
    _teacherIdController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final teacherId = _teacherIdController.text.trim();

      final response = await ApiService.instance.post(
        '/enrollments',
        body: {
          'schoolOrRegion': _schoolOrRegionController.text.trim(),
          if (teacherId.isNotEmpty) 'teacherId': teacherId,
        },
      );
      ApiService.instance.unwrap(response);

      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = e.code == 'CONFLICT' || e.statusCode == 409
            ? 'You are already enrolled in this school/region.'
            : e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Something went wrong. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enroll'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Join a school or region',
                  style: AppTextStyles.heading2,
                ),
                const SizedBox(height: AppSpacing.xs),
                const Text(
                  'Enter the name of the school or region you want to enroll in.',
                  style: AppTextStyles.subtitle,
                ),
                const SizedBox(height: AppSpacing.xl),

                Text(
                  'School / Region',
                  style: AppTextStyles.cardTitle,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _schoolOrRegionController,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    hintText: 'e.g. Govt. Higher Secondary, Bhopal',
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  validator: (value) {
                    final trimmed = value?.trim() ?? '';
                    if (trimmed.length < 2) {
                      return 'Enter at least 2 characters';
                    }
                    if (trimmed.length > 100) {
                      return 'Must be 100 characters or fewer';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),

                Text(
                  'Teacher ID (optional)',
                  style: AppTextStyles.cardTitle,
                ),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _teacherIdController,
                  textInputAction: TextInputAction.done,
                  decoration: InputDecoration(
                    hintText: 'Link to a specific teacher, if you have an ID',
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  validator: (value) {
                    final trimmed = value?.trim() ?? '';
                    if (trimmed.isEmpty) return null;
                    final isValidObjectId =
                        RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(trimmed);
                    if (!isValidObjectId) {
                      return 'Must be a valid teacher ID';
                    }
                    return null;
                  },
                ),

                if (_errorMessage != null) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: AppColors.error.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: AppSpacing.xl),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding:
                          const EdgeInsets.symmetric(vertical: AppSpacing.md),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text('Enroll', style: AppTextStyles.buttonLabel),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
