import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/role_picker_screen.dart';

void main() {
  runApp(const KheloGullyApp());
}

class KheloGullyApp extends StatelessWidget {
  const KheloGullyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KheloGully',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const RolePickerScreen(),
    );
  }
}