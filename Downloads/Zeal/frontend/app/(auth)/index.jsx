import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SLIDES = [
  {
    id: 1,
    title: "Collect &",
    subtitle: "Invest Rare Items.",
    image:
      "https://images.unsplash.com/photo-1769647097480-84d4d8c1d501?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29sbGVjdGlibGUlMjBpdGVtc3xlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 2,
    title: "NFT as Digital",
    subtitle: "Certificate Ownership.",
    image:
      "https://images.unsplash.com/photo-1664022617645-cf71791942e4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bmZ0fGVufDB8fDB8fHww",
  },
  {
    id: 3,
    title: "Transfer of",
    subtitle: "Ownership.",
    image:
      "https://images.unsplash.com/photo-1761014586555-947a9555d302?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dHJhbnNmZXIlMjBvd25lcnNoaXB8ZW58MHx8MHx8fDA%3D",
  },
];

export default function AuthLandingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const SWIPE_THRESHOLD = 50;

        if (dx > SWIPE_THRESHOLD) {
          setCurrentSlide(prev => prev === 0 ? SLIDES.length - 1 : prev - 1);
        } else if (dx < -SWIPE_THRESHOLD) {
          setCurrentSlide(prev => (prev + 1) % SLIDES.length);
        }
      },
    })
  ).current;

  const timerRef = useRef(null);

  const startAutoScroll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 4000);
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    startAutoScroll();
  }, [currentSlide]);

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ImageBackground
        source={{ uri: slide.image }}
        style={styles.backgroundImage}
      >
        <View style={styles.topOverlay} />
        <Text style={styles.appName}>ZEAL</Text>
      </ImageBackground>
      <View style={styles.whitePanel}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setCurrentSlide(index)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dot,
                  index === currentSlide && styles.activeDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.mainText}>{slide.title}</Text>
          <Text style={styles.mainText}>{slide.subtitle}</Text>
        </View>
      </View>
      <View style={styles.stickyButtonsContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 0.65,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 70,
  },
  appName: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -9.6,
    marginTop: 10,
    marginLeft: 20,
    zIndex: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1,
  },
  whitePanel: {
    flex: 0.35,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    justifyContent: "flex-start",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "black",
    marginTop: 20,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "black",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 5,
  },
  mainText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
  },
  stickyButtonsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  loginButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "black",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  registerButtonText: {
    color: "black",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});