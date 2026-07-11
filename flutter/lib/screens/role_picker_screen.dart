import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'pet_registration_screen.dart';
import 'student_registration_screen.dart';
import 'teacher_registration_screen.dart';

class RolePickerScreen extends StatelessWidget {
  const RolePickerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm + 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(AppRadius.lg - 2),
                    ),
                    child: const Icon(
                      Icons.sports_gymnastics,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md - 4),
                  const Text('KheloGully', style: AppTextStyles.heading1),
                ],
              ),
              const SizedBox(height: AppSpacing.xxl),
              const Text('Who are you?', style: AppTextStyles.heading2),
              const SizedBox(height: AppSpacing.xs + 2),
              const Text(
                'Select your role to get started',
                style: AppTextStyles.subtitle,
              ),
              const SizedBox(height: AppSpacing.xl),
              Expanded(
                child: ListView(
                  children: [
                    _RoleCard(
                      icon: Icons.groups_rounded,
                      title: 'PET (School Mode)',
                      subtitle:
                          'Register and run tests for multiple students offline',
                      color: AppColors.rolePet,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const PetRegistrationScreen(),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _RoleCard(
                      icon: Icons.school_rounded,
                      title: 'Student',
                      subtitle: 'Create your own profile and take fitness tests',
                      color: AppColors.roleStudent,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const StudentRegistrationScreen(),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _RoleCard(
                      icon: Icons.person_rounded,
                      title: 'Teacher',
                      subtitle: 'Register with your school to manage your roster',
                      color: AppColors.roleTeacher,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const TeacherRegistrationScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md + 2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm + 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTextStyles.cardTitle),
                    const SizedBox(height: AppSpacing.xs),
                    Text(subtitle, style: AppTextStyles.cardSubtitle),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
