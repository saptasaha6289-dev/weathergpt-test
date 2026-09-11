import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import {
  CloudRain,
  Waypoints,
  Cpu,
  ShieldCheck,
  Compass,
  Radio,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Replace with your active production or Vercel URL
const MAUSAMSETU_WEB_URL = 'https://weathergpt-frontend.vercel.app'; 

export default function App() {
  const handleLaunchWeb = async () => {
    await WebBrowser.openBrowserAsync(MAUSAMSETU_WEB_URL, {
      toolbarColor: '#051124',
      controlsColor: '#38bdf8',
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020814" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / AtmosIQ Team Badge */}
        <View style={styles.teamHeader}>
          <View style={styles.teamLogoContainer}>
            <LinearGradient
              colors={['#06b6d4', '#3b82f6']}
              style={styles.teamLogoGradient}
            >
              <Cpu size={16} color="#ffffff" />
            </LinearGradient>
            <View>
              <Text style={styles.teamLabel}>DEVELOPED BY</Text>
              <Text style={styles.teamName}>AtmosIQ</Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusPulse} />
            <Text style={styles.statusText}>MoES SIH 2026</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#06b6d4', '#2563eb', '#4f46e5']}
              style={styles.iconGradient}
            >
              <CloudRain size={36} color="#ffffff" />
              <View style={styles.bridgeSubIcon}>
                <Waypoints size={16} color="#38bdf8" />
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.heroTitle}>
            Mausam<Text style={styles.heroTitleAccent}>Setu</Text>
          </Text>
          <Text style={styles.heroTagline}>
            Weather • Alerts • Safer Tomorrow
          </Text>
          <Text style={styles.heroSubtitle}>
            Autonomous Meteorological Agent, 3D Elevation Surge Radar & Tactical Evacuation Router
          </Text>
        </View>

        {/* Core Pillars / Project Explanation */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionHeader}>Tactical Capabilities</Text>

          {/* Pillar 1 */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#0c4a6e' }]}>
              <Compass size={20} color="#38bdf8" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Village-Centric Geocoding</Text>
              <Text style={styles.featureDesc}>
                OpenStreetMap Nominatim & Open-Meteo pipeline resolving exact coordinates for small rural Gram Panchayats and coastal blocks across India.
              </Text>
            </View>
          </View>

          {/* Pillar 2 */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#1e1b4b' }]}>
              <Layers size={20} color="#818cf8" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>3D DEM Inundation Simulation</Text>
              <Text style={styles.featureDesc}>
                Real-time surge dials (+0.5m to +6.0m) modeling road submersion thresholds, low-lying culvert chokes, and agrarian drainage backlogs.
              </Text>
            </View>
          </View>

          {/* Pillar 3 */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#064e3b' }]}>
              <ShieldCheck size={20} color="#34d399" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Clearance-Aware Evac Corridors</Text>
              <Text style={styles.featureDesc}>
                Dynamic heuristic routing tailored to vehicle physical intake heights (12cm two-wheelers up to 80cm NDRF rescue rigs) avoiding engine hydrolock.
              </Text>
            </View>
          </View>

          {/* Pillar 4 */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: '#451a03' }]}>
              <Radio size={20} color="#fbbf24" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Quorum Anti-Spoofing & SOS</Text>
              <Text style={styles.featureDesc}>
                Crowdsourced hazard validation applying Haversine consensus clustering and multi-lingual voice dispatch across 6 Indian regional dialects.
              </Text>
            </View>
          </View>
        </View>

        {/* Launch Web Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.launchButton}
            onPress={handleLaunchWeb}
          >
            <LinearGradient
              colors={['#0284c7', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonTextGroup}>
                <ExternalLink size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Launch MausamSetu Platform</Text>
              </View>
              <ChevronRight size={20} color="#93c5fd" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Opens full GIS Doppler Radar, Tactical Ops Command & AI Chatbot
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020814',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  teamLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamLogoGradient: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLabel: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  teamName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1b33',
    borderColor: '#1e3a8a',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  statusText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    position: 'relative',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  bridgeSubIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#020814',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: '#38bdf8',
  },
  heroTagline: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    maxWidth: width * 0.85,
  },
  cardContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#081426',
    borderColor: '#132845',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    color: '#94a3b8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionContainer: {
    alignItems: 'center',
  },
  launchButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});