import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StudentRegistrationScreen extends StatefulWidget {
  const StudentRegistrationScreen({super.key});

  @override
  State<StudentRegistrationScreen> createState() => _StudentRegistrationScreenState();
}

class _StudentRegistrationScreenState extends State<StudentRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _ageController = TextEditingController();
  final _guardianController = TextEditingController();
  final _villageController = TextEditingController();
  final _districtController = TextEditingController();

  String? _selectedGender;
  bool _isLoading = false;
  bool _obscurePassword = true;

  final List<String> _genderOptions = ['Male', 'Female', 'Other'];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _ageController.dispose();
    _guardianController.dispose();
    _villageController.dispose();
    _districtController.dispose();
    super.dispose();
  }

  void _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedGender == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a gender')),
      );
      return;
    }

    setState(() => _isLoading = true);

    // TODO: wire this to POST /auth/register with role: "student"
    // Fields to send: name, phone, password, age, gender,
    // guardianName (optional), village (optional), district (optional)
    // client_type: mobile header required
    // On success -> response includes athleteProfile, store it directly,
    // don't re-fetch it separately.
    await Future.delayed(const Duration(seconds: 1)); // placeholder

    setState(() => _isLoading = false);

    // TODO: navigate to Student home screen on success
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Registration'),
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
                  'Create your Student account',
                  style: AppTextStyles.heading2,
                ),
                const SizedBox(height: AppSpacing.xs + 2),
                const Text(
                  'Track your fitness scores and join programs in your region',
                  style: AppTextStyles.subtitle,
                ),
                const SizedBox(height: AppSpacing.xl),

                _FieldLabel('Full Name'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(hintText: 'Enter your full name'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('Phone Number'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: 'Enter your phone number'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Phone number is required';
                    }
                    if (value.trim().length < 10) {
                      return 'Enter a valid phone number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('Password'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Create a password',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.textSecondary,
                      ),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Password is required';
                    }
                    if (value.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('Age'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _ageController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: 'Enter your age (5-25)'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Age is required';
                    }
                    final age = int.tryParse(value.trim());
                    if (age == null) {
                      return 'Enter a valid number';
                    }
                    if (age < 5 || age > 25) {
                      return 'Age must be between 5 and 25';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('Gender'),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  initialValue: _selectedGender,
                  decoration: const InputDecoration(hintText: 'Select gender'),
                  items: _genderOptions.map((gender) {
                    return DropdownMenuItem(value: gender, child: Text(gender));
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedGender = value);
                  },
                ),
                const SizedBox(height: AppSpacing.xl),

                const Text(
                  'Optional details',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                _FieldLabel('Guardian Name'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _guardianController,
                  decoration: const InputDecoration(hintText: 'Optional'),
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('Village'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _villageController,
                  decoration: const InputDecoration(hintText: 'Optional'),
                ),
                const SizedBox(height: AppSpacing.lg),

                _FieldLabel('District'),
                const SizedBox(height: AppSpacing.sm),
                TextFormField(
                  controller: _districtController,
                  decoration: const InputDecoration(hintText: 'Optional'),
                ),
                const SizedBox(height: AppSpacing.xxl),

                ElevatedButton(
                  onPressed: _isLoading ? null : _handleRegister,
                  child: _isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Register'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    );
  }
}
